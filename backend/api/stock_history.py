"""
Reads a ticker symbol from stdin, returns 5Y daily OHLCV as JSON.
Uses the same yfinance + pickle cache as the optimizer.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from data.fetcher import fetch_single

ticker_raw = sys.stdin.read().strip().upper()
if not ticker_raw:
    print(json.dumps({"error": "no ticker"}))
    sys.exit(1)

# Try NSE first, then BSE
df = fetch_single(f"{ticker_raw}.NS")
if df is None:
    df = fetch_single(f"{ticker_raw}.BO")

if df is None:
    print(json.dumps({"error": f"no data for {ticker_raw}"}))
    sys.exit(1)

df = df.reset_index()
date_col = df.columns[0]

points = [
    {
        "date": str(row[date_col])[:10],
        "open": round(float(row["Open"]), 4),
        "high": round(float(row["High"]), 4),
        "low": round(float(row["Low"]), 4),
        "close": round(float(row["Close"]), 4),
        "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
    }
    for _, row in df.iterrows()
]

print(json.dumps({"ticker": ticker_raw, "points": points}))
