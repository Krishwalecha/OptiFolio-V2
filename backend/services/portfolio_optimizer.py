from __future__ import annotations

import sys
import warnings
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.covariance import LedoitWolf

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    BLEND_ALPHA_DEFAULT,
    MAX_WEIGHT,
    MIN_WEIGHT,
    MONTE_CARLO_SIMS,
    MULTISTART_MINVOL,
    MULTISTART_SHARPE,
    NUM_TOP_STOCKS,
    RANDOM_SEED,
    RISK_FREE_RATE,
    TRADING_DAYS,
)

from services.risk_metrics import full_metrics, portfolio_returns

warnings.filterwarnings("ignore")

RNG = np.random.default_rng(RANDOM_SEED)


def expected_returns(
    stocks: list[str],
    daily_returns: pd.DataFrame,
    model_results: Dict[str, dict],
    blend_alpha: float = BLEND_ALPHA_DEFAULT,
) -> pd.Series:
    ret = daily_returns[stocks].dropna()
    hist = (ret.mean() * TRADING_DAYS).clip(-0.30, 0.30)

    ml_ret = pd.Series(
        {
            s: model_results[s]["predicted_return"] if s in model_results else hist[s]
            for s in stocks
        }
    )
    ml_ret = ml_ret.clip(-0.40, 0.40) * 0.85

    ic_raw = pd.Series(
        {
            s: model_results[s]["metrics"]["ic"] if s in model_results else -1.0
            for s in stocks
        }
    )

    # map IC [-1,1] → [0,1]: IC=0 → 50% ML, IC=-1 → 0%, IC=1 → 100%
    ic_scaled = ((ic_raw + 1) / 2).clip(0, 1)
    per_alpha = (blend_alpha * ic_scaled).clip(0, 0.75)

    return (per_alpha * ml_ret + (1 - per_alpha) * hist)[stocks]


def covariance_matrix(stocks: list[str], daily_returns: pd.DataFrame) -> pd.DataFrame:
    ret = daily_returns[stocks].dropna()
    lw = LedoitWolf().fit(ret.values)
    cov = lw.covariance_ * TRADING_DAYS
    return pd.DataFrame(cov, index=stocks, columns=stocks)


def _perf(
    w: np.ndarray, mu: np.ndarray, sigma: np.ndarray, rfr: float = RISK_FREE_RATE
) -> Tuple[float, float, float]:
    ret = float(w @ mu)
    vol = float(np.sqrt(w @ sigma @ w))
    sr = (ret - rfr) / vol if vol > 1e-10 else 0.0
    return ret, vol, sr


def _random_weights(n: int, n_sims: int, lo: float, hi: float) -> np.ndarray:
    hi = max(hi, 1.0 / n)
    lo = min(lo, 1.0 / n)
    w = RNG.dirichlet(np.ones(n), size=n_sims)
    for _ in range(20):
        w = np.clip(w, lo, hi)
        w = w / w.sum(axis=1, keepdims=True)
    return w


def monte_carlo(
    exp_ret: pd.Series,
    cov: pd.DataFrame,
    n_sims: int = MONTE_CARLO_SIMS,
    rfr: float = RISK_FREE_RATE,
    lo: float = MIN_WEIGHT,
    hi: float = MAX_WEIGHT,
) -> pd.DataFrame:
    stocks = exp_ret.index.tolist()
    n = len(stocks)
    mu = exp_ret.values.astype(np.float32)
    sig = cov.values.astype(np.float32)
    W = _random_weights(n, n_sims, lo, hi).astype(np.float32)
    ret = W @ mu
    var = np.einsum("ij,jk,ik->i", W, sig, W)
    vol = np.sqrt(np.clip(var, 0, None))
    sr = np.where(vol > 1e-10, (ret - rfr) / vol, 0.0)
    df = pd.DataFrame(W, columns=stocks)
    df["return"] = ret
    df["volatility"] = vol
    df["sharpe"] = sr
    return df


def _constraints_bounds(n: int, lo: float, hi: float):
    hi = max(hi, 1.0 / n)  # n*hi >= 1 so weights can always sum to 1
    lo = min(lo, hi / 2, 0.9 / n)  # n*lo < 1 so constraints are always feasible
    cons = [{"type": "eq", "fun": lambda w: w.sum() - 1.0}]
    bounds = [(lo, hi)] * n
    return cons, bounds


def _multistart(
    objective, n: int, cons: list, bounds: list, n_restarts: int, seed: int = 0
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    best_w, best_v = None, np.inf
    for _ in range(n_restarts):
        w0 = rng.dirichlet(np.ones(n))
        w0 = np.clip(w0, bounds[0][0], bounds[0][1])
        w0 /= w0.sum()
        res = minimize(
            objective,
            w0,
            method="SLSQP",
            bounds=bounds,
            constraints=cons,
            options={"ftol": 1e-13, "maxiter": 2000},
        )
        if res.success and res.fun < best_v:
            best_v = res.fun
            best_w = res.x
    if best_w is None:
        best_w = np.full(n, 1 / n)
    lo, hi = bounds[0]
    for _ in range(20):
        best_w = np.clip(best_w, lo, hi)
        s = best_w.sum()
        if abs(s - 1.0) < 1e-9:
            break
        best_w /= s
    return best_w


def optimize_score_weighted(
    exp_ret: pd.Series,
    cov: pd.DataFrame,
    model_results: dict,
    mode: str = "composite",  # composite | return | inv_vol
    lo: float = MIN_WEIGHT,
) -> pd.Series:
    # weight ∝ composite_score (balanced), predicted_return (aggressive), 1/vol (conservative)
    stocks = exp_ret.index.tolist()
    n = len(stocks)

    if mode == "inv_vol":
        vols = np.sqrt(np.diag(cov.values))
        inv_vol = pd.Series(1.0 / (vols + 1e-10), index=stocks)
        inv_vol /= inv_vol.sum()
        scores = pd.Series(
            {
                s: max(model_results[s]["composite_score"], 0)
                if s in model_results
                else 0.0
                for s in stocks
            }
        )
        score_w = (
            scores / scores.sum()
            if scores.sum() > 1e-10
            else pd.Series(np.full(n, 1.0 / n), index=stocks)
        )
        raw = 0.60 * inv_vol + 0.40 * score_w  # 60% safety + 40% quality
    elif mode == "return":
        raw = exp_ret.clip(lower=0)
    else:  # composite
        raw = pd.Series(
            {
                s: max(model_results[s]["composite_score"], 0)
                if s in model_results
                else 0.0
                for s in stocks
            }
        )

    if raw.sum() < 1e-10:
        return pd.Series(np.full(n, 1.0 / n), index=stocks)

    w = raw / raw.sum()

    # drop below-floor weights and redistribute
    while True:
        below = w[(w > 0) & (w < lo)].index
        if below.empty:
            break
        w[below] = 0.0
        if w[w > 0].empty:
            w = pd.Series(np.full(n, 1.0 / n), index=stocks)
            break
        w[w > 0] = w[w > 0] / w[w > 0].sum()

    return w


def optimize_max_sharpe(
    exp_ret: pd.Series,
    cov: pd.DataFrame,
    rfr: float = RISK_FREE_RATE,
    lo: float = MIN_WEIGHT,
    hi: float = MAX_WEIGHT,
) -> pd.Series:
    stocks = exp_ret.index.tolist()
    n, mu, sig = len(stocks), exp_ret.values, cov.values
    cons, bounds = _constraints_bounds(n, lo, hi)

    def neg_sharpe(w):
        r, v, _ = _perf(w, mu, sig, rfr)
        return -(r - rfr) / v if v > 1e-10 else 0.0

    w = _multistart(neg_sharpe, n, cons, bounds, MULTISTART_SHARPE, seed=0)
    return pd.Series(w, index=stocks)


def optimize_min_vol(
    exp_ret: pd.Series,
    cov: pd.DataFrame,
    lo: float = MIN_WEIGHT,
    hi: float = MAX_WEIGHT,
) -> pd.Series:
    stocks = exp_ret.index.tolist()
    n, sig = len(stocks), cov.values
    cons, bounds = _constraints_bounds(n, lo, hi)

    def vol_obj(w):
        return float(np.sqrt(w @ sig @ w))

    w = _multistart(vol_obj, n, cons, bounds, MULTISTART_MINVOL, seed=1)
    return pd.Series(w, index=stocks)


def optimize_max_diversification(
    exp_ret: pd.Series,
    cov: pd.DataFrame,
    lo: float = MIN_WEIGHT,
    hi: float = MAX_WEIGHT,
) -> pd.Series:
    stocks = exp_ret.index.tolist()
    n, sig = len(stocks), cov.values
    ind_vols = np.sqrt(np.diag(sig))
    cons, bounds = _constraints_bounds(n, lo, hi)

    def neg_dr(w):
        port_vol = np.sqrt(w @ sig @ w)
        return -(w @ ind_vols) / (port_vol + 1e-10)

    w = _multistart(neg_dr, n, cons, bounds, MULTISTART_MINVOL, seed=2)
    return pd.Series(w, index=stocks)


def optimize_aggressive(
    exp_ret: pd.Series,
    cov: pd.DataFrame,
    gamma: float = 0.3,
    lo: float = MIN_WEIGHT,
    hi: float = MAX_WEIGHT,
) -> pd.Series:
    stocks = exp_ret.index.tolist()
    n, mu, sig = len(stocks), exp_ret.values, cov.values
    cons, bounds = _constraints_bounds(n, lo, hi)

    def neg_utility(w):
        return -(float(w @ mu) - gamma * float(w @ sig @ w))

    w = _multistart(neg_utility, n, cons, bounds, MULTISTART_SHARPE, seed=3)
    return pd.Series(w, index=stocks)


def optimize_equal_weight(stocks: list[str]) -> pd.Series:
    return pd.Series(np.full(len(stocks), 1 / len(stocks)), index=stocks)


def compute_allocation(
    weights: pd.Series, investment: float, close_prices: pd.Series
) -> pd.DataFrame:
    rows = []
    for stock, w in weights[weights > 0].items():
        price = float(close_prices.get(stock, np.nan))
        if np.isnan(price) or price <= 0:
            shares, actual = 0, 0.0
        else:
            shares = int((w * investment) // price)
            actual = shares * price
        rows.append(
            {
                "stock": stock,
                "weight_pct": w * 100,
                "allocated_inr": w * investment,
                "price_inr": price,
                "shares": shares,
                "actual_inr": actual,
            }
        )

    df = pd.DataFrame(rows)
    remaining = investment - df["actual_inr"].sum()
    valid_prices = df.loc[df["price_inr"] > 0, "price_inr"]

    if not valid_prices.empty:
        min_price = valid_prices.min()
        while remaining >= min_price:
            affordable = df[df["price_inr"] <= remaining].copy()
            if affordable.empty:
                break
            # buy one more share of whichever stock is furthest below its target
            affordable["gap"] = affordable["allocated_inr"] - affordable["actual_inr"]
            idx = affordable["gap"].idxmax()
            price = df.loc[idx, "price_inr"]
            df.loc[idx, "shares"] += 1
            df.loc[idx, "actual_inr"] += price
            remaining -= price

    df = df.sort_values("weight_pct", ascending=False)
    invested = df["actual_inr"].sum()
    df["actual_weight_pct"] = df["actual_inr"] / invested * 100 if invested > 0 else 0.0
    return df.reset_index(drop=True)


def run_optimization(
    stocks: list[str],
    daily_returns: pd.DataFrame,
    model_results: Dict[str, dict],
    investment: float,
    close_prices: pd.Series,
    blend_alpha: float = BLEND_ALPHA_DEFAULT,
    rfr: float = RISK_FREE_RATE,
    verbose: bool = True,
    min_weight: float = MIN_WEIGHT,
    max_weight: float = MAX_WEIGHT,
) -> dict:
    exp_ret = expected_returns(stocks, daily_returns, model_results, blend_alpha)
    cov = covariance_matrix(stocks, daily_returns)
    mc_df = monte_carlo(exp_ret, cov, rfr=rfr, lo=min_weight, hi=max_weight)

    w_sharpe = optimize_score_weighted(
        exp_ret, cov, model_results, mode="composite", lo=min_weight
    )
    w_minvol = optimize_score_weighted(
        exp_ret, cov, model_results, mode="inv_vol", lo=min_weight
    )
    w_aggr = optimize_score_weighted(
        exp_ret, cov, model_results, mode="return", lo=min_weight
    )

    portfolios = {
        "Max Sharpe": w_sharpe,
        "Min Volatility": w_minvol,
        "Aggressive Growth": w_aggr,
    }

    perf = {}
    for label, w in portfolios.items():
        r, v, sr = _perf(w.values, exp_ret.values, cov.values, rfr)
        perf[label] = {
            "expected_return": r,
            "volatility": v,
            "sharpe_ratio": sr,
            "expected_return_pct": r * 100,
            "annual_volatility_pct": v * 100,
        }

    allocations = {
        label: compute_allocation(w, investment, close_prices)
        for label, w in portfolios.items()
    }

    return {
        "stocks": stocks,
        "expected_returns": exp_ret,
        "cov_matrix": cov,
        "mc_df": mc_df,
        "portfolios": portfolios,
        "performance": perf,
        "allocations": allocations,
        "risk_free_rate": rfr,
        "investment_amount": investment,
    }
