from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import RISK_FREE_RATE, TRADING_DAYS


def annualised_return(returns: pd.Series) -> float:
    n_years = len(returns) / TRADING_DAYS
    return float((np.exp(returns.sum()) ** (1 / n_years)) - 1) if n_years > 0 else 0.0


def annualised_volatility(returns: pd.Series) -> float:
    return float(returns.std() * np.sqrt(TRADING_DAYS))


def sharpe_ratio(returns: pd.Series, rfr: float = RISK_FREE_RATE) -> float:
    vol = annualised_volatility(returns)
    return (annualised_return(returns) - rfr) / vol if vol > 0 else 0.0


def sortino_ratio(returns: pd.Series, rfr: float = RISK_FREE_RATE) -> float:
    daily_rf = rfr / TRADING_DAYS
    downside = returns[returns < daily_rf]
    down_vol = (
        float(downside.std() * np.sqrt(TRADING_DAYS)) if len(downside) > 0 else 1e-9
    )
    return (annualised_return(returns) - rfr) / down_vol


def max_drawdown(returns: pd.Series) -> tuple[float, int]:
    cum = returns.cumsum().apply(np.exp)
    peak = cum.cummax()
    dd = (cum - peak) / peak
    mdd = float(dd.min())

    # Duration: longest consecutive drawdown period
    in_dd = (dd < 0).astype(int)
    groups = in_dd * (in_dd.groupby((in_dd != in_dd.shift()).cumsum()).cumcount() + 1)
    dur = int(groups.max()) if len(groups) > 0 else 0

    return mdd, dur


def calmar_ratio(returns: pd.Series) -> float:
    mdd, _ = max_drawdown(returns)
    ann = annualised_return(returns)
    return ann / abs(mdd) if mdd != 0 else 0.0


def var_historical(returns: pd.Series, conf: float = 0.95) -> float:
    return float(np.percentile(returns, (1 - conf) * 100))


def cvar_historical(returns: pd.Series, conf: float = 0.95) -> float:
    cut = var_historical(returns, conf)
    tail = returns[returns <= cut]
    return float(tail.mean()) if len(tail) > 0 else cut


def omega_ratio(returns: pd.Series, rfr: float = RISK_FREE_RATE) -> float:
    threshold = rfr / TRADING_DAYS
    gains = (returns[returns > threshold] - threshold).sum()
    losses = (threshold - returns[returns <= threshold]).sum()
    return float(gains / losses) if losses > 0 else np.inf


def tail_ratio(returns: pd.Series) -> float:
    p95 = abs(np.percentile(returns, 95))
    p05 = abs(np.percentile(returns, 5))
    return float(p95 / p05) if p05 > 0 else 0.0


def hit_rate(returns: pd.Series) -> float:
    return float((returns > 0).mean())


def beta(port: pd.Series, bench: pd.Series) -> float:
    aligned = pd.concat([port, bench], axis=1).dropna()
    if len(aligned) < 30:
        return 1.0
    cov = np.cov(aligned.iloc[:, 0].values, aligned.iloc[:, 1].values)
    var = np.var(aligned.iloc[:, 1].values, ddof=1)
    return float(cov[0, 1] / var) if var > 0 else 1.0


def portfolio_returns(
    weights: dict | pd.Series,
    daily_returns: pd.DataFrame,
) -> pd.Series:
    if isinstance(weights, pd.Series):
        w = weights
    else:
        w = pd.Series(weights)

    stocks = [s for s in w.index if s in daily_returns.columns]
    w_valid = w[stocks]
    w_valid = w_valid / w_valid.sum()

    ret = daily_returns[stocks].dropna()
    daily = ret.values @ w_valid.values
    return pd.Series(daily, index=ret.index, name="portfolio")


def full_metrics(
    returns: pd.Series,
    rfr: float = RISK_FREE_RATE,
    benchmark: Optional[pd.Series] = None,
    label: str = "Portfolio",
) -> dict:
    mdd, dur = max_drawdown(returns)
    bt = beta(returns, benchmark) if benchmark is not None else None

    return {
        "label": label,
        "annualised_return": annualised_return(returns),
        "annualised_volatility": annualised_volatility(returns),
        "sharpe_ratio": sharpe_ratio(returns, rfr),
        "sortino_ratio": sortino_ratio(returns, rfr),
        "calmar_ratio": calmar_ratio(returns),
        "omega_ratio": omega_ratio(returns, rfr),
        "tail_ratio": tail_ratio(returns),
        "hit_rate": hit_rate(returns),
        "max_drawdown": mdd,
        "drawdown_duration_d": dur,
        "var_95": var_historical(returns, 0.95),
        "var_99": var_historical(returns, 0.99),
        "cvar_95": cvar_historical(returns, 0.95),
        "beta": bt,
        "n_days": len(returns),
    }


_FMT_MAP = {
    "annualised_return": ("{:+.2%}", "Annualised Return"),
    "annualised_volatility": ("{:.2%}", "Annualised Volatility"),
    "sharpe_ratio": ("{:.3f}", "Sharpe Ratio"),
    "sortino_ratio": ("{:.3f}", "Sortino Ratio"),
    "calmar_ratio": ("{:.3f}", "Calmar Ratio"),
    "omega_ratio": ("{:.3f}", "Omega Ratio"),
    "tail_ratio": ("{:.3f}", "Tail Ratio"),
    "hit_rate": ("{:.1%}", "Hit Rate"),
    "max_drawdown": ("{:.2%}", "Max Drawdown"),
    "drawdown_duration_d": ("{:d} d", "Drawdown Duration"),
    "var_95": ("{:.2%}", "VaR (95 %, 1d)"),
    "var_99": ("{:.2%}", "VaR (99 %, 1d)"),
    "cvar_95": ("{:.2%}", "CVaR / ES (95 %)"),
    "beta": ("{:.3f}", "Beta vs Nifty 50"),
}


def metrics_table(metrics: dict) -> pd.DataFrame:
    rows = []
    for key, (fmt, label) in _FMT_MAP.items():
        val = metrics.get(key)
        if val is None:
            continue
        try:
            formatted = fmt.format(
                int(val) if key == "drawdown_duration_d" else float(val)
            )
        except Exception:
            formatted = str(val)
        rows.append({"Metric": label, "Value": formatted})
    return pd.DataFrame(rows)
