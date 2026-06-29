from __future__ import annotations

import sys
import warnings
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from joblib import Parallel, delayed

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import FORWARD_RETURN_DAYS, MIN_ROWS_REQUIRED, PARALLEL_JOBS

warnings.filterwarnings("ignore")


def _sma(s: pd.Series, w: int) -> pd.Series:
    return s.rolling(w, min_periods=w).mean()


def _ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False, min_periods=span).mean()


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    d = close.diff()
    gain = d.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-d.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    return 100 - 100 / (1 + gain / (loss + 1e-10))


def _macd(close: pd.Series) -> Tuple[pd.Series, pd.Series, pd.Series]:
    e12 = _ema(close, 12)
    e26 = _ema(close, 26)
    line = e12 - e26
    sig = _ema(line, 9)
    return line, sig, line - sig


def _atr(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    pc = close.shift(1)
    tr = pd.concat([high - low, (high - pc).abs(), (low - pc).abs()], axis=1).max(
        axis=1
    )
    return tr.ewm(alpha=1 / period, adjust=False).mean()  # Wilder's smoothing


def _bollinger(close: pd.Series, window: int = 20, k: float = 2.0):
    mid = _sma(close, window)
    std = close.rolling(window, min_periods=window).std()
    upper = mid + k * std
    lower = mid - k * std
    width = (upper - lower) / (mid + 1e-10)
    pct_b = (close - lower) / (upper - lower + 1e-10)
    return width, pct_b


def _stochastic(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    k_period: int = 14,
    d_period: int = 3,
):
    low_k = low.rolling(k_period).min()
    high_k = high.rolling(k_period).max()
    k = 100 * (close - low_k) / (high_k - low_k + 1e-10)
    d = k.rolling(d_period).mean()
    return k, d


def _williams_r(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    hh = high.rolling(period).max()
    ll = low.rolling(period).min()
    return -100 * (hh - close) / (hh - ll + 1e-10)


def _cci(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20
) -> pd.Series:
    typical = (high + low + close) / 3
    mean_t = typical.rolling(period).mean()
    mad = typical.rolling(period).apply(
        lambda x: np.mean(np.abs(x - x.mean())), raw=True
    )
    return (typical - mean_t) / (0.015 * mad + 1e-10)


def _obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    direction = np.sign(close.diff()).fillna(0)
    return (direction * volume).cumsum()


def _mfi(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    volume: pd.Series,
    period: int = 14,
) -> pd.Series:
    tp = (high + low + close) / 3
    rmf = tp * volume
    diff = tp.diff()
    pos = rmf.where(diff > 0, 0).rolling(period).sum()
    neg = rmf.where(diff < 0, 0).rolling(period).sum()
    return 100 - 100 / (1 + pos / (neg + 1e-10))


def _cmf(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    volume: pd.Series,
    period: int = 20,
) -> pd.Series:
    mfv = ((close - low) - (high - close)) / (high - low + 1e-10) * volume
    return mfv.rolling(period).sum() / volume.rolling(period).sum().replace(0, 1e-10)


def _roc(close: pd.Series, period: int) -> pd.Series:
    return close.pct_change(period) * 100


def engineer_features(
    df: pd.DataFrame, forward_days: int = FORWARD_RETURN_DAYS
) -> pd.DataFrame:
    close = df["Close"].copy()
    high = df["High"].copy()
    low = df["Low"].copy()
    volume = df["Volume"].replace(0, np.nan).ffill().fillna(1.0)

    feat: Dict[str, pd.Series] = {}

    # trend
    for w in (5, 10, 20, 50, 100, 200):
        sma = _sma(close, w)
        feat[f"vs_sma{w}"] = (close - sma) / (sma + 1e-10)

    for span in (9, 21):
        ema = _ema(close, span)
        feat[f"vs_ema{span}"] = (close - ema) / (ema + 1e-10)

    # 52-week range position
    r_max = close.rolling(252, min_periods=60).max()
    r_min = close.rolling(252, min_periods=60).min()
    feat["price_pct_52w"] = (close - r_min) / (r_max - r_min + 1e-10)

    # Golden / Death cross ratio
    feat["sma50_vs_sma200"] = (_sma(close, 50) / (_sma(close, 200) + 1e-10)) - 1

    # momentum
    feat["rsi_14"] = _rsi(close, 14)
    feat["rsi_28"] = _rsi(close, 28)
    feat["rsi_7"] = _rsi(close, 7)

    macd_l, macd_s, macd_h = _macd(close)
    feat["macd_hist"] = macd_h
    feat["macd_vs_price"] = macd_l / (close + 1e-10)
    feat["macd_sig_ratio"] = macd_l / (macd_s + 1e-10)

    for p in (1, 3, 5, 10, 21, 63):
        feat[f"roc_{p}"] = _roc(close, p)
        feat[f"lag_ret_{p}"] = np.log(close / close.shift(p).replace(0, np.nan))

    stk_k, stk_d = _stochastic(high, low, close)
    feat["stoch_k"] = stk_k
    feat["stoch_d"] = stk_d
    feat["stoch_kd"] = stk_k - stk_d

    feat["williams_r"] = _williams_r(high, low, close)
    feat["cci_20"] = _cci(high, low, close)
    feat["cci_14"] = _cci(high, low, close, 14)

    # volatility
    atr = _atr(high, low, close)
    feat["atr_ratio"] = atr / (close + 1e-10)

    bb_w, bb_p = _bollinger(close)
    feat["bb_width"] = bb_w
    feat["bb_pct_b"] = bb_p

    log_ret = np.log(close / close.shift(1))
    for w in (5, 10, 21, 63):
        feat[f"rvol_{w}"] = log_ret.rolling(w).std() * np.sqrt(252)
        feat[f"skew_{w}"] = log_ret.rolling(w).skew()
        feat[f"kurt_{w}"] = log_ret.rolling(w).kurt()

    # Parkinson volatility estimator (uses H/L intraday)
    feat["parkinson_vol"] = (
        (np.log(high / low) ** 2).rolling(21).mean() / (4 * np.log(2))
    ).apply(np.sqrt) * np.sqrt(252)

    # volume
    vol_ma20 = volume.rolling(20).mean()
    feat["vol_ratio_10"] = volume / (volume.rolling(10).mean() + 1e-10)
    feat["vol_ratio_20"] = volume / (vol_ma20 + 1e-10)
    feat["vol_ratio_50"] = volume / (volume.rolling(50).mean() + 1e-10)

    obv_raw = _obv(close, volume)
    feat["obv_norm"] = obv_raw / (vol_ma20 * 100 + 1e-10)
    feat["obv_roc"] = obv_raw.pct_change(5)

    feat["mfi_14"] = _mfi(high, low, close, volume)
    feat["cmf_20"] = _cmf(high, low, close, volume)

    # microstructure
    feat["hl_ratio"] = (high - low) / (close + 1e-10)  # intraday range
    feat["co_ratio"] = (close - df["Open"]) / (df["Open"] + 1e-10)  # body size

    # build df
    feat_df = pd.DataFrame(feat, index=df.index)

    # target (no lookahead)
    log_close = np.log(close + 1e-10)
    feat_df["target"] = log_close.shift(-forward_days) - log_close

    # Drop NaN from warm-up and the last `forward_days` rows (no target)
    feat_df.dropna(inplace=True)

    return feat_df


def _safe_engineer(
    name: str, df: pd.DataFrame, forward_days: int
) -> Tuple[str, pd.DataFrame | None]:
    try:
        feat = engineer_features(df, forward_days)
        if len(feat) >= MIN_ROWS_REQUIRED:
            return name, feat
        return name, None
    except Exception as e:
        print(f"  [WARN] Feature engineering failed for {name}: {e}")
        return name, None


def engineer_all_stocks(
    stock_data: Dict[str, pd.DataFrame],
    forward_days: int = FORWARD_RETURN_DAYS,
    n_jobs: int = PARALLEL_JOBS,
) -> Dict[str, pd.DataFrame]:
    results_raw = Parallel(n_jobs=n_jobs, prefer="threads")(
        delayed(_safe_engineer)(name, df, forward_days)
        for name, df in stock_data.items()
    )
    return {name: feat for name, feat in results_raw if feat is not None}
