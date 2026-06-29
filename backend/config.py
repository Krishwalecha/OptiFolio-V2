from pathlib import Path

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs"
CACHE_DIR = BASE_DIR / "data" / "cache"
DATA_DIR = BASE_DIR / "data"

DATA_PERIOD = "5y"  # yfinance period
DATA_INTERVAL = "1d"  # OHLCV granularity
CACHE_MAX_AGE_HOURS = 12  # refresh cache if older than this
BATCH_DOWNLOAD = True  # download all tickers in one yfinance call (faster)

FORWARD_RETURN_DAYS = 21  # ~1-month prediction horizon
MIN_ROWS_REQUIRED = 300  # discard stocks with too little history

TEST_SPLIT_RATIO = 0.2  # 20 % holdout (time-ordered)
N_CV_FOLDS = 5  # TimeSeriesSplit folds for Optuna
OPTUNA_N_TRIALS = 60  # Bayesian trials per stock (deep mode)
OPTUNA_TIMEOUT_SEC = 45  # hard wall-clock cap per stock
PARALLEL_JOBS = -1  # -1 = use all CPU cores (joblib)
EARLY_STOPPING_ROUNDS = 30  # XGBoost early stopping on val set

XGB_SEARCH_SPACE = {
    "n_estimators": (200, 800),
    "max_depth": (3, 7),
    "learning_rate": (0.01, 0.2),  # log scale
    "subsample": (0.6, 1.0),
    "colsample_bytree": (0.5, 1.0),
    "min_child_weight": (1, 10),
    "reg_alpha": (1e-4, 5.0),  # log scale
    "reg_lambda": (1e-4, 5.0),  # log scale
    "gamma": (0.0, 1.0),
}

XGB_DEFAULT_PARAMS = {
    "n_estimators": 400,
    "max_depth": 5,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "gamma": 0.0,
    "random_state": 42,
    "tree_method": "hist",
    "verbosity": 0,
    "n_jobs": -1,
}

RISK_FREE_RATE = 0.068  # Indian 10-yr G-Sec yield (~6.8 %)
MONTE_CARLO_SIMS = 15000  # random portfolios (vectorised, fast)
MIN_WEIGHT = 0.03  # floor: 3 % per stock
MAX_WEIGHT = 0.30  # ceiling: 30 % per stock
NUM_TOP_STOCKS = 10  # pick top-N by ML score
MULTISTART_SHARPE = 40  # SLSQP multi-start restarts
MULTISTART_MINVOL = 20

# Blend: XGBoost vs historical mean return
# 0 = pure historical   |   1 = pure ML
BLEND_ALPHA_DEFAULT = 0.5

TRADING_DAYS = 252
RANDOM_SEED = 42
