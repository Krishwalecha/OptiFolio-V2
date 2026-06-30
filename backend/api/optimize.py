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
def run_optimize(
    tickers: list[str],
    investment: float = 100_000,
    risk: str = "balanced",
    tune: bool = False,
) -> dict:
    risk = risk.lower().strip()
    if risk not in RISK_PROFILES:
        risk = "balanced"

    profile = RISK_PROFILES[risk]
    universe = _build_universe(tickers)

    if len(universe) < 2:
        return {"error": "Need at least 2 valid tickers."}

    try:
        # 1. Fetch OHLCV
        stock_data = fetch_all_stocks(universe, use_cache=True, verbose=False)
        if len(stock_data) < 2:
            return {"error": "Could not fetch enough stock data. Check your tickers."}

        close_matrix = build_close_matrix(stock_data)
        daily_returns = compute_log_returns(close_matrix)
        close_prices = close_matrix.iloc[-1]

        # 2. Benchmark (Nifty 50)
        nifty_df = fetch_nifty50(use_cache=True)
        benchmark: Optional[pd.Series] = None
        if nifty_df is not None:
            b = np.log(nifty_df["Close"] / nifty_df["Close"].shift(1)).dropna()
            benchmark = b.reindex(daily_returns.index).dropna()
            del nifty_df

        # 3. Feature engineering + XGBoost training
        features = engineer_all_stocks(stock_data)
        del stock_data
        gc.collect()

        model_results = train_all_models(features, tune=tune, verbose=False)
        del features
        gc.collect()

        if not model_results:
            return {"error": "Model training failed. Try different tickers."}

        # strip booster/scaler objects — only scalar metrics are needed downstream
        for v in model_results.values():
            v.pop("model", None)
            v.pop("scaler", None)
        gc.collect()

        prediction_summary = summarise_predictions(model_results)

        # 4. keep stocks with positive composite_score; drop bearish/no-signal
        dropped: list[dict] = []

        def _drop_reason(row) -> str:
            if row["predicted_return"] < 0:
                return f"Bearish — model predicts {row['predicted_return'] * 100:.1f}% annual return"
            if row["ic"] <= 0:
                return "No signal — IC ≤ 0 (model is guessing, not predicting)"
            return "Composite score non-positive — low return × low confidence"

        good = prediction_summary[prediction_summary["composite_score"] > 0].copy()
        for _, row in prediction_summary[
            prediction_summary["composite_score"] <= 0
        ].iterrows():
            dropped.append(
                {
                    "ticker": str(row["stock"]),
                    "predicted_return_pct": round(
                        float(row["predicted_return"]) * 100, 1
                    ),
                    "composite_score": round(float(row["composite_score"]), 4),
                    "ic": round(float(row["ic"]), 3),
                    "dir_accuracy": round(float(row["dir_accuracy"]), 3),
                    "reason": _drop_reason(row),
                }
            )

        if len(good) < 2:
            candidates = prediction_summary.nlargest(2, "composite_score")[
                "stock"
            ].tolist()
            dropped = []
        else:
            candidates = good["stock"].tolist()

        # 5. MPT optimisation
        opt = run_optimization(
            stocks=candidates,
            daily_returns=daily_returns,
            model_results=model_results,
            investment=investment,
            close_prices=close_prices,
            blend_alpha=BLEND_ALPHA,
            rfr=RISK_FREE_RATE,
            verbose=False,
            min_weight=profile["min_weight"],
            max_weight=profile["max_weight"],
        )

        # 6. pick strategy for risk profile
        preferred = profile["strategy"]
        available = list(opt["portfolios"].keys())
        chosen_label = preferred if preferred in available else available[0]

        weights = opt["portfolios"][chosen_label]
        alloc_df = opt["allocations"][chosen_label]
        perf = opt["performance"][chosen_label]

        # 7. historical risk metrics
        port_ret = portfolio_returns(weights.to_dict(), daily_returns)
        metrics = full_metrics(port_ret, RISK_FREE_RATE, benchmark, label=chosen_label)

        # 8. chart data
        chart_universe = {s: universe.get(s, f"{s}.NS") for s in candidates}
        chart_data = _fetch_chart_data(chart_universe)

        # 9. ML prediction scores
        scores: dict[str, dict] = {}
        for _, row in prediction_summary.iterrows():
            if row["stock"] in candidates:
                scores[row["stock"]] = {
                    "predicted_return": round(float(row.get("predicted_return", 0)), 4),
                    "composite_score": round(float(row.get("composite_score", 0)), 4),
                    "dir_accuracy": round(float(row.get("dir_accuracy", 0)), 4),
                    "ic": round(float(row.get("ic", 0)), 4),
                }

        # 10. build allocation
        allocation = []
        for _, row in alloc_df.iterrows():
            allocation.append(
                {
                    "ticker": str(row["stock"]),
                    "weight_pct": round(float(row["weight_pct"]), 2),
                    "price_inr": round(float(row["price_inr"]), 2),
                    "shares": int(row["shares"]),
                    "invested_inr": round(float(row["actual_inr"]), 2),
                }
            )

        result = {
            "risk_profile": risk,
            "strategy": chosen_label,
            "investment": investment,
            "candidates": candidates,
            "allocation": allocation,
            "performance": {
                "expected_return": round(float(perf["expected_return"]), 4),
                "annualised_volatility": round(
                    float(metrics.get("annualised_volatility", perf["volatility"])), 4
                ),
                "sharpe_ratio": round(
                    float(
                        (perf["expected_return"] - RISK_FREE_RATE) / perf["volatility"]
                        if perf["volatility"] > 1e-10
                        else 0.0
                    ),
                    3,
                ),
                "sortino_ratio": round(float(metrics.get("sortino_ratio", 0)), 3),
                "max_drawdown": round(float(metrics.get("max_drawdown", 0)), 4),
                "var_95": round(float(metrics.get("var_95", 0)), 4),
                "beta": round(float(metrics.get("beta") or 0), 3),
                "annualised_return_hist": round(
                    float(metrics.get("annualised_return", 0)), 4
                ),
                "calmar_ratio": round(float(metrics.get("calmar_ratio", 0)), 3),
                "omega_ratio": round(float(metrics.get("omega_ratio", 0)), 3),
                "tail_ratio": round(float(metrics.get("tail_ratio", 0)), 3),
                "hit_rate": round(float(metrics.get("hit_rate", 0)), 4),
                "var_99": round(float(metrics.get("var_99", 0)), 4),
                "cvar_95": round(float(metrics.get("cvar_95", 0)), 4),
                "drawdown_duration_d": int(metrics.get("drawdown_duration_d", 0)),
                "n_days": int(metrics.get("n_days", 0)),
            },
            "scores": scores,
            "chart_data": chart_data,
            "dropped_stocks": dropped,
        }

        return _to_json(result)

    except Exception as e:
        return {"error": f"Optimizer error: {str(e)}"}


# entrypoint
if __name__ == "__main__":
    # UTF-8 on Windows to prevent charmap crash from non-ASCII chars in logs
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    try:
        payload = json.loads(sys.stdin.read())
        tickers = payload.get("tickers", [])
        investment = float(payload.get("investment", 100_000))
        risk = str(payload.get("risk", "balanced"))
        tune = bool(payload.get("tune", False))

        if not isinstance(tickers, list) or len(tickers) < 2:
            print(json.dumps({"error": "Need at least 2 tickers."}))
            sys.exit(0)

        result = run_optimize(tickers, investment, risk, tune)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": f"Optimizer crashed: {str(e)}"}))
        sys.exit(1)
