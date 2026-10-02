from __future__ import annotations

import io
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).parent.parent))

from data import fetch_all_stocks, fetch_nifty50

DRIFT_ALERT_PP = 5.0


def run(holdings: list[dict], saved_at: str) -> dict:
    t0 = pd.Timestamp(saved_at).tz_localize(None).normalize()
    names = {h["ticker"].upper(): h for h in holdings}
    data = fetch_all_stocks({t: f"{t}.NS" if "." not in t else t for t in names}, use_cache=True, verbose=False)

    rows = []
    for t, h in names.items():
        df = data.get(t.split(".")[0])
        if df is None or df.empty:
            rows.append({"ticker": t, "error": "No price data"})
            continue
        c = df["Close"]
        before = c.loc[:t0]
        buy = float(before.iloc[-1]) if len(before) else float(c.iloc[0])
        now = float(c.iloc[-1])
        invested = float(h.get("invested_inr") or 0)
        shares = invested / buy if buy > 0 else 0.0
        rows.append(
            {
                "ticker": t,
                "target_pct": float(h.get("allocation") or 0),
                "buy_price": round(buy, 2),
                "price": round(now, 2),
                "shares_est": round(shares, 3),
                "invested_inr": round(invested, 2),
                "value_inr": round(shares * now, 2),
            }
        )

    ok = [r for r in rows if "error" not in r]
    total_val = sum(r["value_inr"] for r in ok)
    total_inv = sum(r["invested_inr"] for r in ok)
    target_sum = sum(r["target_pct"] for r in ok) or 100.0
    for r in ok:
        r["pnl_inr"] = round(r["value_inr"] - r["invested_inr"], 2)
        r["pnl_pct"] = round((r["value_inr"] / r["invested_inr"] - 1) * 100, 2) if r["invested_inr"] else 0.0
        r["current_pct"] = round(r["value_inr"] / total_val * 100, 2) if total_val else 0.0
        target = r["target_pct"] / target_sum * 100
        r["drift_pp"] = round(r["current_pct"] - target, 2)
        delta = target / 100 * total_val - r["value_inr"]
        r["trade_shares"] = int(np.round(delta / r["price"])) if r["price"] > 0 else 0

    nifty_ret = None
    n = fetch_nifty50(use_cache=True)
    if n is not None and len(n):
        nc = n["Close"]
        b = nc.loc[:t0]
        if len(b):
            nifty_ret = round((float(nc.iloc[-1]) / float(b.iloc[-1]) - 1) * 100, 2)

    curve = []
    try:
        closes = pd.DataFrame({r["ticker"]: data[r["ticker"].split(".")[0]]["Close"] for r in ok}).sort_index().ffill()
        since = closes.loc[t0:]
        if len(since) >= 2 and total_inv:
            value = sum(since[r["ticker"]] * r["shares_est"] for r in ok)
            base = float(value.iloc[0])
            nb = n["Close"].reindex(since.index).ffill() if n is not None else None
            step = max(len(value) // 120, 1)
            idx = value.index[::step].append(value.index[-1:]).unique()
            curve = [
                {"date": str(i.date()), "portfolio": round(float(value.loc[i]) / base * 100 - 100, 2), **({"nifty50": round(float(nb.loc[i]) / float(nb.iloc[0]) * 100 - 100, 2)} if nb is not None and pd.notna(nb.loc[i]) else {})}
                for i in idx
            ]
    except Exception:
        curve = []

    week = None
    try:
        closes = pd.DataFrame({r["ticker"]: data[r["ticker"].split(".")[0]]["Close"] for r in ok}).sort_index().ffill()
        last = closes.index[-1]
        start = max(t0, last - pd.Timedelta(days=7))
        before = closes.loc[:start]
        c0 = before.iloc[-1] if len(before) else closes.iloc[0]
        c1 = closes.iloc[-1]
        v0 = sum(float(c0[r["ticker"]]) * r["shares_est"] for r in ok)
        v1 = sum(float(c1[r["ticker"]]) * r["shares_est"] for r in ok)
        nw = None
        if n is not None and len(n):
            nc = n["Close"]
            nb = nc.loc[:start]
            nw = round((float(nc.iloc[-1]) / float(nb.iloc[-1] if len(nb) else nc.iloc[0]) - 1) * 100, 2)
        week = {
            "from": str((before.index[-1] if len(before) else closes.index[0]).date()),
            "to": str(last.date()),
            "portfolio_pct": round((v1 / v0 - 1) * 100, 2) if v0 else 0.0,
            "value_change_inr": round(v1 - v0, 2),
            "nifty_pct": nw,
            "holdings": {r["ticker"]: round((float(c1[r["ticker"]]) / float(c0[r["ticker"]]) - 1) * 100, 2) for r in ok},
        }
    except Exception:
        week = None

    max_drift = max((abs(r["drift_pp"]) for r in ok), default=0.0)
    return {
        "saved_at": str(t0.date()),
        "as_of": str(max(d.index[-1] for d in data.values()).date()) if data else None,
        "holdings": sorted(rows, key=lambda r: -abs(r.get("drift_pp", 0))),
        "total_invested": round(total_inv, 2),
        "total_value": round(total_val, 2),
        "total_pnl_pct": round((total_val / total_inv - 1) * 100, 2) if total_inv else 0.0,
        "nifty_return_pct": nifty_ret,
        "max_drift_pp": round(max_drift, 2),
        "needs_rebalance": max_drift >= DRIFT_ALERT_PP,
        "threshold_pp": DRIFT_ALERT_PP,
        "curve": curve,
        "week": week,
        "note": "Share counts and buy prices are estimated from the closing price on the day the portfolio was saved.",
    }


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    try:
        p = json.loads(sys.stdin.read())
        print(json.dumps(run(p["holdings"], p["savedAt"])))
    except Exception as e:
        print(json.dumps({"error": f"Rebalance check failed: {e}"}))
        sys.exit(1)
