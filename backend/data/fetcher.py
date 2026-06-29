import os
import pickle
import sys
import tempfile
import time
import warnings
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import pandas as pd
import yfinance as yf

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    BATCH_DOWNLOAD,
    CACHE_DIR,
    CACHE_MAX_AGE_HOURS,
    DATA_INTERVAL,
    DATA_PERIOD,
)

warnings.filterwarnings("ignore")


def _cache_path(ticker: str) -> Path:
    Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)
    safe = ticker.replace(".", "_").replace("^", "IDX_")
    return Path(CACHE_DIR) / f"{safe}.pkl"


def _is_fresh(path: Path) -> bool:
    if not path.exists():
        return False
    age_h = (time.time() - path.stat().st_mtime) / 3600
    return age_h < CACHE_MAX_AGE_HOURS


def _load_cache(path: Path) -> Optional[pd.DataFrame]:
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception:
        return None


def _save_cache(path: Path, df: pd.DataFrame) -> None:
    tmp = path.with_suffix(".tmp")
    with open(tmp, "wb") as f:
        pickle.dump(df, f, protocol=pickle.HIGHEST_PROTOCOL)
    tmp.replace(path)


def _clean(raw: pd.DataFrame, ticker: str) -> Optional[pd.DataFrame]:
    if raw is None or raw.empty:
        return None

    # yfinance ≥ 0.2 returns a MultiIndex when multiple tickers requested
    if isinstance(raw.columns, pd.MultiIndex):
        # columns = (field, ticker) — select this ticker
        if ticker in raw.columns.get_level_values(1):
            raw = raw.xs(ticker, axis=1, level=1)
        else:
            raw.columns = raw.columns.get_level_values(0)

    needed = {"Open", "High", "Low", "Close", "Volume"}
    if not needed.issubset(raw.columns):
        return None

    df = raw[list(needed)].copy()
    df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    # Replace zero volumes with NaN, then forward-fill
    df["Volume"] = df["Volume"].replace(0, np.nan).ffill()

    # Drop rows where Close is NaN or zero
    df = df[df["Close"].notna() & (df["Close"] > 0)]

    return df if len(df) >= 100 else None


def _batch_download(
    tickers: list[str],
    period: str,
    interval: str,
) -> Dict[str, pd.DataFrame]:
    try:
        raw = yf.download(
            tickers,
            period=period,
            interval=interval,
            auto_adjust=True,
            progress=False,
            threads=True,
            group_by="ticker",
        )
    except Exception as e:
        print(f"  [WARN] Batch download failed: {e}")
        return {}

    results: Dict[str, pd.DataFrame] = {}
    for ticker in tickers:
        df = _clean(raw, ticker)
        if df is not None:
            results[ticker] = df
    return results


def fetch_single(
    ticker: str,
    period: str = DATA_PERIOD,
    interval: str = DATA_INTERVAL,
    use_cache: bool = True,
) -> Optional[pd.DataFrame]:
    cache = _cache_path(ticker)
    if use_cache and _is_fresh(cache):
        return _load_cache(cache)

    try:
        raw = yf.download(
            ticker,
            period=period,
            interval=interval,
            auto_adjust=True,
            progress=False,
            threads=False,
        )
        df = _clean(raw, ticker)
        if df is not None and use_cache:
            _save_cache(cache, df)
        return df
    except Exception as e:
        print(f"  [WARN] {ticker}: {e}")
        return None


def fetch_all_stocks(
    stock_universe: Dict[str, str],
    use_cache: bool = True,
    verbose: bool = True,
    period: str = DATA_PERIOD,
    interval: str = DATA_INTERVAL,
) -> Dict[str, pd.DataFrame]:
    name_to_ticker = dict(stock_universe)
    ticker_to_name = {v: k for k, v in name_to_ticker.items()}

    data: Dict[str, pd.DataFrame] = {}
    need_download: list[str] = []

    # serve from cache
    for name, ticker in name_to_ticker.items():
        cache = _cache_path(ticker)
        if use_cache and _is_fresh(cache):
            df = _load_cache(cache)
            if df is not None:
                data[name] = df
                continue
        need_download.append(ticker)

    if verbose:
        print(f"\n{'─' * 56}")
        print(
            f"  Data fetch  |  universe={len(stock_universe)}  "
            f"cached={len(data)}  to-download={len(need_download)}"
        )
        print(f"{'─' * 56}")

    if not need_download:
        if verbose:
            print("  All stocks served from cache.\n")
        return data

    # batch download
    if BATCH_DOWNLOAD and len(need_download) > 1:
        if verbose:
            print(
                f"  Batch-downloading {len(need_download)} tickers ...",
                end=" ",
                flush=True,
            )
        batch = _batch_download(need_download, period, interval)
        if verbose:
            print(f"got {len(batch)}/{len(need_download)}")

        for ticker, df in batch.items():
            name = ticker_to_name.get(ticker, ticker)
            data[name] = df
            if use_cache:
                _save_cache(_cache_path(ticker), df)
        # Tickers the batch missed
        need_download = [t for t in need_download if t not in batch]

    # parallel fallback for stragglers────
    if need_download:
        if verbose:
            print(f"  Single-fetching {len(need_download)} remaining ticker(s) …")
        with ThreadPoolExecutor(max_workers=min(8, len(need_download))) as pool:
            fut_map = {
                pool.submit(fetch_single, t, period, interval, use_cache): t
                for t in need_download
            }
            for fut in as_completed(fut_map):
                ticker = fut_map[fut]
                name = ticker_to_name.get(ticker, ticker)
                df = fut.result()
                if df is not None:
                    data[name] = df
                    if verbose:
                        print(f"    ✓ {name:<15} ({ticker})  {len(df)} rows")
                else:
                    if verbose:
                        print(f"    ✗ {name:<15} ({ticker})  skipped")

    if verbose:
        ok = len(data)
        total = len(stock_universe)
        print(f"\n  Loaded: {ok}/{total} stocks\n")

    return data


def build_close_matrix(stock_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    closes = {name: df["Close"] for name, df in stock_data.items()}
    matrix = pd.DataFrame(closes).sort_index()
    matrix = matrix.ffill()

    # Drop stocks with > 10 % NaN after ffill
    thresh = int(len(matrix) * 0.9)
    matrix = matrix.dropna(axis=1, thresh=thresh)
    matrix = matrix.ffill().bfill()
    return matrix


def compute_log_returns(close_matrix: pd.DataFrame) -> pd.DataFrame:
    return np.log(close_matrix / close_matrix.shift(1)).dropna()


def fetch_nifty50(use_cache: bool = True) -> Optional[pd.DataFrame]:
    return fetch_single("^NSEI", period=DATA_PERIOD, use_cache=use_cache)
