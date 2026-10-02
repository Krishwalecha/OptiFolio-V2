from __future__ import annotations

import gc
import json
import sys
import warnings
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from config import RISK_FREE_RATE
from data import (
    build_close_matrix,
    compute_log_returns,
    fetch_all_stocks,
    fetch_nifty50,
)
from services import (
    engineer_all_stocks,
    full_metrics,
    portfolio_returns,
    run_optimization,
    summarise_predictions,
    train_all_models,
)
from services.portfolio_optimizer import compute_allocation

MOMENTUM_STRENGTH = 0.35
BLEND_MAX = 0.5

CORE_TICKER = "NIFTYBEES"
CORE_MAX = 0.8

BLEND_ALPHA = 0.5

RISK_PROFILES = {
    "conservative": {
        "min_weight": 0.04,
        "max_weight": 0.20,
        "strategy": "Min Volatility",
    },
    "balanced": {
        "min_weight": 0.03,
        "max_weight": 0.28,
        "strategy": "Max Sharpe",
    },
    "aggressive": {
        "min_weight": 0.03,
        "max_weight": 0.30,
        "strategy": "Aggressive Growth",
    },
}

CHART_PERIOD = "5y"


# helpers
def _to_json(obj):
    if isinstance(obj, dict):
        return {k: _to_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_json(v) for v in obj]
    if isinstance(obj, (pd.Series, pd.DataFrame)):
        return json.loads(obj.to_json())
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.integer, np.floating)):
        return obj.item()
    if isinstance(obj, Path):
        return str(obj)
    return obj


def _build_universe(tickers: list[str]) -> dict[str, str]:
    universe: dict[str, str] = {}
    seen_names: set[str] = set()
    for t in tickers:
        t = t.strip().upper()
        if not t:
            continue
        yf_sym = t if "." in t else f"{t}.NS"
        name = yf_sym.split(".")[0]
        if name not in seen_names:  # deduplicate
            universe[name] = yf_sym
            seen_names.add(name)
    return universe


def _fetch_chart_data(universe: dict[str, str]) -> dict[str, list[dict]]:
    chart_data: dict[str, list[dict]] = {}
    yf_syms = list(universe.values())

    try:
        raw = yf.download(
            yf_syms,
            period=CHART_PERIOD,
            interval="1d",
            auto_adjust=True,
            progress=False,
            group_by="ticker",
        )
    except Exception:
        return chart_data

    for name, yf_sym in universe.items():
        try:
            if len(yf_syms) == 1:
                df = raw.copy()
            elif isinstance(raw.columns, pd.MultiIndex):
                if yf_sym in raw.columns.get_level_values(0):
                    df = raw[yf_sym].copy()
                else:
                    continue
            else:
                continue  # unexpected shape

            if df.empty:
                continue

            df = df.dropna(subset=["Close"])
            records = []
            for idx, row in df.iterrows():
                records.append(
                    {
                        "date": str(idx.date()),
                        "open": round(float(row.get("Open", row["Close"])), 2),
                        "high": round(float(row.get("High", row["Close"])), 2),
                        "low": round(float(row.get("Low", row["Close"])), 2),
                        "close": round(float(row["Close"]), 2),
                        "volume": int(row.get("Volume", 0) or 0),
                    }
                )
            if records:
                chart_data[name] = records
        except Exception:
            continue

    return chart_data


# pipeline
HISTORY_YEARS = 5


def _inr(v: float) -> str:
    n = str(int(round(v)))
    head, tail = n[:-3], n[-3:]
    while len(head) > 2:
        tail = head[-2:] + "," + tail
        head = head[:-2]
    return "₹" + (head + "," + tail if head else tail)


def _window(stock_data: dict, end: pd.Timestamp) -> dict:
    start = end - pd.DateOffset(years=HISTORY_YEARS)
    out = {}
    for name, df in stock_data.items():
        d = df[(df.index > start) & (df.index <= end)]
        if len(d) > 60:
            out[name] = d
    return out


def _cap(w: pd.Series, hi: float) -> pd.Series:
    w = w.copy()
    for _ in range(50):
        over = w > hi + 1e-12
        if not over.any():
            break
        excess = float((w[over] - hi).sum())
        w[over] = hi
        free = ~over & (w > 0)
        if not free.any():
            break
        w[free] += excess * w[free] / w[free].sum()
    return w / w.sum()


def _pipeline(stock_data: dict, benchmark_close: Optional[pd.Series], profile: dict, lo: float, hi: Optional[float], tune: bool):
    close_matrix = build_close_matrix(stock_data)
    daily_returns = compute_log_returns(close_matrix)
    close_prices = close_matrix.iloc[-1]

    benchmark = None
    if benchmark_close is not None:
        b = np.log(benchmark_close / benchmark_close.shift(1)).dropna()
        benchmark = b.reindex(daily_returns.index).dropna()

    features = engineer_all_stocks(stock_data)
    model_results = train_all_models(features, tune=tune, verbose=False)
    del features
    gc.collect()
    if not model_results:
        raise ValueError("Model training failed. Try different tickers.")
    for v in model_results.values():
        v.pop("model", None)
        v.pop("scaler", None)

    prediction_summary = summarise_predictions(model_results)
    # a stock with too little history is dropped from the price matrix; never hand it to the optimizer
    summary = prediction_summary[prediction_summary["stock"].isin(daily_returns.columns)]

    dropped: list[dict] = []

    def _drop_reason(row) -> str:
        if row["predicted_return"] < 0:
            m = abs(row.get("predicted_month", row["predicted_return"] / 12)) * 100
            return f"Model expects it to fall about {m:.1f}% over the next month" if m >= 0.1 else "Model expects no gain over the next month"
        if row["ic"] <= 0:
            return "The model showed no predictive skill for this stock in testing"
        return "Expected return is too low for the confidence the model has in it"

    good = summary[summary["composite_score"] > 0]
    for _, row in summary[summary["composite_score"] <= 0].iterrows():
        dropped.append(
            {
                "ticker": str(row["stock"]),
                "predicted_return_pct": round(float(row["predicted_return"]) * 100, 1),
                "composite_score": round(float(row["composite_score"]), 4),
                "ic": round(float(row["ic"]), 3),
                "dir_accuracy": round(float(row["dir_accuracy"]), 3),
                "reason": _drop_reason(row),
            }
        )
    if len(good) < 2:
        candidates = summary.nlargest(2, "composite_score")["stock"].tolist()
        dropped = [d for d in dropped if d["ticker"] not in candidates]
    else:
        candidates = good["stock"].tolist()

    opt = run_optimization(
        stocks=candidates,
        daily_returns=daily_returns,
        model_results=model_results,
        investment=1.0,
        close_prices=close_prices,
        blend_alpha=BLEND_ALPHA,
        rfr=RISK_FREE_RATE,
        verbose=False,
        min_weight=lo,
        max_weight=hi if hi is not None else 1.0,
    )
    label = profile["strategy"] if profile["strategy"] in opt["portfolios"] else next(iter(opt["portfolios"]))
    weights = opt["portfolios"][label]
    if int((weights > 1e-6).sum()) < 2:
        # score weighting can zero every stock but one; never return a single-stock portfolio
        vol = np.sqrt(np.diag(opt["cov_matrix"].values))
        inv = pd.Series(1.0 / (vol + 1e-10), index=opt["cov_matrix"].index)
        weights = inv / inv.sum()
    # Tested point in time in research/variants (docs/model.md): +1.6 pts a year with better worst cases.
    # 1) momentum tilt: 12-month return skipping the last month, z-scored across the basket
    if len(close_matrix) > 260:
        mom = close_matrix.iloc[-22] / close_matrix.iloc[-253] - 1
        z = (mom - mom.mean()) / (mom.std() + 1e-9)
        weights = weights * np.exp(MOMENTUM_STRENGTH * z.reindex(weights.index).fillna(0.0))
        weights = weights / weights.sum()
    # 2) blend with an even split of every stock, more so the more stocks there are
    basket = list(close_matrix.columns)
    lam = float(np.clip((len(basket) - 3) / 6, 0.0, BLEND_MAX))
    if lam > 0:
        even = pd.Series(1.0 / len(basket), index=basket)
        weights = (1 - lam) * weights.reindex(basket).fillna(0.0) + lam * even
        weights = weights / weights.sum()
    if hi is not None:
        weights = _cap(weights, hi)
    return {
        "weights": weights[weights > 1e-6],
        "label": label,
        "opt": opt,
        "daily_returns": daily_returns,
        "close_prices": close_prices,
        "benchmark": benchmark,
        "summary": prediction_summary,
        "candidates": candidates,
        "dropped": dropped,
    }


def run_optimize(tickers: list[str], investment: float = 100_000, risk: str = "balanced", tune: bool = False, constraints: Optional[dict] = None) -> dict:
    risk = risk.lower().strip()
    if risk not in RISK_PROFILES:
        risk = "balanced"
    profile = RISK_PROFILES[risk]
    constraints = constraints or {}
    lo = float(constraints["minWeight"]) if constraints.get("minWeight") is not None else profile["min_weight"]
    hi = float(constraints["maxWeight"]) if constraints.get("maxWeight") is not None else None
    core = float(constraints.get("core") or 0.0)
    core = min(max(core / 100 if core > 1 else core, 0.0), CORE_MAX)
    universe = _build_universe(tickers)
    if len(universe) < 2:
        return {"error": "Need at least 2 valid tickers."}

    try:
        data10 = fetch_all_stocks(universe, use_cache=True, verbose=False, period="10y")
        missing = [s for s in universe if s not in data10]
        if len(data10) < 2:
            return {"error": "Could not fetch enough stock data. Check your tickers."}
        nifty_df = fetch_nifty50(use_cache=True, period="10y")
        nifty_close = nifty_df["Close"] if nifty_df is not None else None
        end = max(df.index[-1] for df in data10.values())
        live = _window(data10, end)

        res = _pipeline(live, nifty_close, profile, lo, hi, tune)
        weights, opt, daily_returns = res["weights"], res["opt"], res["daily_returns"]
        # a stock whose slice of the money cannot buy one share would show a weight but hold nothing
        unaffordable = []
        budget = investment * (1 - core)
        while len(weights) > 1:
            px = res["close_prices"].reindex(weights.index)
            short = [t for t in weights.index if px[t] > 0 and weights[t] * budget < px[t]]
            if not short:
                break
            t = min(short, key=lambda k: weights[k] * budget / px[k])
            unaffordable.append({"ticker": t, "price": float(px[t]), "slice": float(weights[t] * budget)})
            weights = weights.drop(t)
            weights = weights / weights.sum()
        exp_ret, cov = opt["expected_returns"], opt["cov_matrix"]
        ew = weights.reindex(exp_ret.index).fillna(0.0)
        e_ret = float(ew.values @ exp_ret.values)
        e_vol = float(np.sqrt(ew.values @ cov.values @ ew.values))
        sleeve_point = [round(e_vol, 4), round(e_ret, 4)]

        core_close = None
        if core > 0:
            cd = fetch_all_stocks({CORE_TICKER: f"{CORE_TICKER}.NS"}, use_cache=True, verbose=False, period="10y")
            if CORE_TICKER in cd:
                core_close = cd[CORE_TICKER]["Close"]
            else:
                core = 0.0

        close_prices = res["close_prices"]
        if core > 0:
            core_lr = np.log(core_close / core_close.shift(1)).reindex(daily_returns.index).fillna(0.0)
            daily_returns = daily_returns.assign(**{CORE_TICKER: core_lr})
            joined = daily_returns[list(weights.index) + [CORE_TICKER]].dropna()
            core_mu = float(np.clip(joined[CORE_TICKER].mean() * 252, -0.3, 0.3))
            e_ret = (1 - core) * e_ret + core * core_mu
            wv = np.append(weights.values * (1 - core), core)
            e_vol = float(np.sqrt(wv @ (joined.cov().values * 252) @ wv))
            weights = pd.concat([weights * (1 - core), pd.Series({CORE_TICKER: core})])
            close_prices = pd.concat([close_prices, pd.Series({CORE_TICKER: float(core_close.iloc[-1])})])

        alloc_df = compute_allocation(weights, investment, close_prices)
        port_ret = portfolio_returns(weights.to_dict(), daily_returns)
        metrics = full_metrics(port_ret, RISK_FREE_RATE, res["benchmark"], label=res["label"])

        mc = opt["mc_df"]
        pts = mc.sample(min(320, len(mc)), random_state=7)
        frontier = {
            "simulated": [[round(float(v), 4), round(float(r), 4)] for v, r in zip(pts["volatility"], pts["return"])],
            "chosen": sleeve_point,
            "n_simulated": int(len(mc)),
        }

        scores = {
            str(row["stock"]): {
                "predicted_return": round(float(row.get("predicted_return", 0)), 4),
                "predicted_month": round(float(row.get("predicted_month", 0)), 4),
                "composite_score": round(float(row.get("composite_score", 0)), 4),
                "dir_accuracy": round(float(row.get("dir_accuracy", 0)), 4),
                "ic": round(float(row.get("ic", 0)), 4),
            }
            for _, row in res["summary"].iterrows()
            if row["stock"] in weights.index
        }

        chart_close = build_close_matrix(live)
        chart_data = {
            s: [{"date": str(i.date()), "open": round(float(v), 2), "high": round(float(v), 2), "low": round(float(v), 2), "close": round(float(v), 2), "volume": 0} for i, v in chart_close[s].dropna().items()]
            for s in weights.index
            if s in chart_close.columns
        }

        dropped = [d for d in res["dropped"] if d["ticker"] not in weights.index] + [
            {"ticker": s, "predicted_return_pct": 0.0, "composite_score": 0.0, "ic": 0.0, "dir_accuracy": 0.0, "reason": "No reliable price data found for this ticker."} for s in missing
        ]
        dropped += [
            {"ticker": s, "predicted_return_pct": 0.0, "composite_score": 0.0, "ic": 0.0, "dir_accuracy": 0.0, "reason": f"Its weight came out below the {lo * 100:.0f}% minimum, so it was spread over the other stocks."}
            for s in res["candidates"]
            if s not in weights.index and s not in {u["ticker"] for u in unaffordable}
        ]

        dropped += [
            {"ticker": u["ticker"], "predicted_return_pct": 0.0, "composite_score": 0.0, "ic": 0.0, "dir_accuracy": 0.0, "reason": f"One share costs {_inr(u['price'])}, more than its {_inr(u['slice'])} share of your amount. Invest more to include it."}
            for u in unaffordable
        ]
        listed = set(weights.index) | {d["ticker"] for d in dropped}
        dropped += [
            {"ticker": s, "predicted_return_pct": 0.0, "composite_score": 0.0, "ic": 0.0, "dir_accuracy": 0.0, "reason": "Not enough trading history to train a model on; it needs about two years of prices."}
            for s in universe
            if s not in listed
        ]

        allocation = [
            {
                "ticker": str(row["stock"]),
                "weight_pct": round(float(row["weight_pct"]), 2),
                "price_inr": round(float(row["price_inr"]), 2),
                "shares": int(row["shares"]),
                "invested_inr": round(float(row["actual_inr"]), 2),
            }
            for _, row in alloc_df.iterrows()
        ]

        result = {
            "risk_profile": risk,
            "strategy": res["label"],
            "investment": investment,
            "candidates": res["candidates"],
            "constraints": {"min_weight": lo, "max_weight": hi if hi is not None else 1.0},
            "allocation": allocation,
            "performance": {
                "expected_return": round(e_ret, 4),
                "annualised_volatility": round(e_vol, 4),
                "sharpe_ratio": round((e_ret - RISK_FREE_RATE) / e_vol if e_vol > 1e-10 else 0.0, 3),
                "sortino_ratio": round(float(metrics.get("sortino_ratio", 0)), 3),
                "max_drawdown": round(float(metrics.get("max_drawdown", 0)), 4),
                "var_95": round(float(metrics.get("var_95", 0)), 4),
                "beta": round(float(metrics.get("beta") or 0), 3),
                "annualised_return_hist": round(float(metrics.get("annualised_return", 0)), 4),
                "volatility_hist": round(float(metrics.get("annualised_volatility", 0)), 4),
                "sharpe_hist": round(float(metrics.get("sharpe_ratio", 0)), 3),
                "calmar_ratio": round(float(metrics.get("calmar_ratio", 0)), 3),
                "omega_ratio": round(float(metrics.get("omega_ratio", 0)), 3) if np.isfinite(metrics.get("omega_ratio", 0)) else 999.0,
                "tail_ratio": round(float(metrics.get("tail_ratio", 0)), 3),
                "hit_rate": round(float(metrics.get("hit_rate", 0)), 4),
                "var_99": round(float(metrics.get("var_99", 0)), 4),
                "cvar_95": round(float(metrics.get("cvar_95", 0)), 4),
                "drawdown_duration_d": int(metrics.get("drawdown_duration_d", 0)),
                "n_days": int(metrics.get("n_days", 0)),
            },
            "scores": scores,
            "frontier": frontier,
            "core": {"ticker": CORE_TICKER, "weight": round(core, 4)} if core > 0 else None,
            "chart_data": chart_data,
            "dropped_stocks": dropped,
            "engine": "per-stock-xgb-v1",
        }
        del data10, live
        gc.collect()
        return _to_json(result)

    except Exception as e:
        return {"error": f"Optimizer error: {str(e)}"}


# entrypoint
if __name__ == "__main__":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    try:
        payload = json.loads(sys.stdin.read())
        tickers = payload.get("tickers", [])
        if not isinstance(tickers, list) or len(tickers) < 2:
            print(json.dumps({"error": "Need at least 2 tickers."}))
            sys.exit(0)
        result = run_optimize(
            tickers,
            float(payload.get("investment", 100_000)),
            str(payload.get("risk", "balanced")),
            bool(payload.get("tune", payload.get("deepMode", False))),
            payload.get("constraints") or {},
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"Optimizer crashed: {str(e)}"}))
        sys.exit(1)
