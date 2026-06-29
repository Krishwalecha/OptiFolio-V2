from __future__ import annotations

import pickle
import sys
import warnings
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from joblib import Parallel, delayed
from scipy.stats import spearmanr
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import RobustScaler

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    CACHE_DIR,
    EARLY_STOPPING_ROUNDS,
    FORWARD_RETURN_DAYS,
    N_CV_FOLDS,
    OPTUNA_N_TRIALS,
    OPTUNA_TIMEOUT_SEC,
    PARALLEL_JOBS,
    RANDOM_SEED,
    TEST_SPLIT_RATIO,
    TRADING_DAYS,
    XGB_DEFAULT_PARAMS,
    XGB_SEARCH_SPACE,
)

warnings.filterwarnings("ignore")

try:
    import optuna

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    OPTUNA_OK = True
except ImportError:
    OPTUNA_OK = False

MODEL_CACHE_DIR = Path(CACHE_DIR) / "models"
MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

EXCLUDE_COLS = {"target"}


def _feat_cols(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in EXCLUDE_COLS]


def _ts_split(df: pd.DataFrame, ratio: float = TEST_SPLIT_RATIO):
    split = int(len(df) * (1 - ratio))
    return df.iloc[:split], df.iloc[split:]


def _scale(
    X_tr: np.ndarray, X_te: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, RobustScaler]:
    sc = RobustScaler()
    return sc.fit_transform(X_tr), sc.transform(X_te), sc


def _ic(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if len(y_true) < 10:
        return 0.0
    r, _ = spearmanr(y_true, y_pred)
    return float(r) if not np.isnan(r) else 0.0


def _tune(X_tr: np.ndarray, y_tr: np.ndarray) -> dict:
    tscv = TimeSeriesSplit(n_splits=N_CV_FOLDS)
    space = XGB_SEARCH_SPACE

    def objective(trial: "optuna.Trial") -> float:
        params = {
            "n_estimators": trial.suggest_int("n_estimators", *space["n_estimators"]),
            "max_depth": trial.suggest_int("max_depth", *space["max_depth"]),
            "learning_rate": trial.suggest_float(
                "learning_rate", *space["learning_rate"], log=True
            ),
            "subsample": trial.suggest_float("subsample", *space["subsample"]),
            "colsample_bytree": trial.suggest_float(
                "colsample_bytree", *space["colsample_bytree"]
            ),
            "min_child_weight": trial.suggest_int(
                "min_child_weight", *space["min_child_weight"]
            ),
            "reg_alpha": trial.suggest_float(
                "reg_alpha", *space["reg_alpha"], log=True
            ),
            "reg_lambda": trial.suggest_float(
                "reg_lambda", *space["reg_lambda"], log=True
            ),
            "gamma": trial.suggest_float("gamma", *space["gamma"]),
            "random_state": RANDOM_SEED,
            "tree_method": "hist",
            "verbosity": 0,
            "n_jobs": 1,  # parallelism is at the stock level
        }
        ic_scores = []
        for fold, (tr_idx, val_idx) in enumerate(tscv.split(X_tr)):
            Xtr, Xval = X_tr[tr_idx], X_tr[val_idx]
            ytr, yval = y_tr[tr_idx], y_tr[val_idx]

            cv_params = {**params, "n_estimators": min(params["n_estimators"], 600)}

            m = xgb.XGBRegressor(
                **cv_params,
                early_stopping_rounds=EARLY_STOPPING_ROUNDS,
            )
            m.fit(Xtr, ytr, eval_set=[(Xval, yval)], verbose=False)
            pred = m.predict(Xval)
            ic = _ic(yval, pred)  # optimise IC not MSE
            ic_scores.append(ic)

            trial.report(-float(np.mean(ic_scores)), step=fold)
            if trial.should_prune():
                raise optuna.TrialPruned()

        return -float(np.mean(ic_scores))

    study = optuna.create_study(
        direction="minimize",  # minimise negative IC = maximise IC
        sampler=optuna.samplers.TPESampler(seed=RANDOM_SEED, multivariate=True),
        pruner=optuna.pruners.MedianPruner(n_startup_trials=10, n_warmup_steps=2),
    )
    study.optimize(
        objective,
        n_trials=OPTUNA_N_TRIALS,
        timeout=OPTUNA_TIMEOUT_SEC,
        show_progress_bar=False,
        n_jobs=1,
    )
    best = study.best_params
    best.update(
        {
            "random_state": RANDOM_SEED,
            "tree_method": "hist",
            "verbosity": 0,
            "n_jobs": 1,
        }
    )
    return best


def train_stock_model(
    name: str,
    feat_df: pd.DataFrame,
    tune: bool = True,
    test_ratio: float = TEST_SPLIT_RATIO,
) -> Optional[dict]:
    feat_cols = _feat_cols(feat_df)
    train_df, test_df = _ts_split(feat_df, test_ratio)

    if len(train_df) < 150 or len(test_df) < 30:
        return None

    X_tr, y_tr = train_df[feat_cols].values, train_df["target"].values
    X_te, y_te = test_df[feat_cols].values, test_df["target"].values

    X_tr_s, X_te_s, scaler = _scale(X_tr, X_te)

    # HPO
    if tune and OPTUNA_OK and len(X_tr) > 200:
        params = _tune(X_tr_s, y_tr)
    else:
        params = dict(XGB_DEFAULT_PARAMS)
        params["n_jobs"] = 1

    # train final model (last 15% of train as internal val for early stopping)
    val_split = int(len(X_tr_s) * 0.85)
    X_fit, X_val = X_tr_s[:val_split], X_tr_s[val_split:]
    y_fit, y_val = y_tr[:val_split], y_tr[val_split:]

    model = xgb.XGBRegressor(
        **params,
        early_stopping_rounds=EARLY_STOPPING_ROUNDS,
    )
    model.fit(
        X_fit,
        y_fit,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    # evaluate
    y_pred = model.predict(X_te_s)
    rmse = float(np.sqrt(mean_squared_error(y_te, y_pred)))
    ic_score = _ic(y_te, y_pred)
    dir_acc = float(np.mean(np.sign(y_pred) == np.sign(y_te)))

    # feature importance
    importance = pd.Series(model.feature_importances_, index=feat_cols).sort_values(
        ascending=False
    )

    # forecast next period
    latest = feat_df[feat_cols].iloc[[-1]].values
    latest_s = scaler.transform(latest)
    raw_pred = float(model.predict(latest_s)[0])

    sigma = np.std(y_tr)
    raw_pred = np.clip(raw_pred, -3 * sigma, 3 * sigma)
    annualised = raw_pred * (TRADING_DAYS / FORWARD_RETURN_DAYS)
    annualised = np.clip(annualised, -0.50, 0.50)

    # confidence = 0.25 base + IC component + dir_acc above 50% component
    ic_component = max(ic_score, 0.0)
    dir_component = min(max(dir_acc - 0.50, 0.0) * 2.0, 1.0)
    confidence = np.clip(0.25 + 0.50 * ic_component + 0.25 * dir_component, 0.25, 1.0)
    composite_score = annualised * confidence

    # cache
    _persist_model(name, model, scaler, feat_cols, params)

    return {
        "name": name,
        "model": model,
        "scaler": scaler,
        "feature_cols": feat_cols,
        "params": params,
        "metrics": {
            "rmse": rmse,
            "ic": ic_score,
            "dir_accuracy": dir_acc,
            "prediction_std": float(np.std(y_pred)),
            "target_std": float(np.std(y_te)),
            "prediction_mean": float(np.mean(y_pred)),
            "target_mean": float(np.mean(y_te)),
            "n_train": len(X_tr),
            "n_test": len(X_te),
        },
        "feature_importance": importance,
        "predicted_return_raw": raw_pred,
        "predicted_return": annualised,
        "composite_score": composite_score,
    }


def _persist_model(name: str, model, scaler, feat_cols: list, params: dict) -> None:
    payload = {
        "model": model,
        "scaler": scaler,
        "feature_cols": feat_cols,
        "params": params,
    }
    path = MODEL_CACHE_DIR / f"{name}.pkl"
    tmp = path.with_suffix(".tmp")
    with open(tmp, "wb") as f:
        pickle.dump(payload, f, protocol=pickle.HIGHEST_PROTOCOL)
    tmp.replace(path)


def load_cached_model(name: str) -> Optional[dict]:
    path = MODEL_CACHE_DIR / f"{name}.pkl"
    if path.exists():
        with open(path, "rb") as f:
            return pickle.load(f)
    return None


def _safe_train(
    name: str, feat_df: pd.DataFrame, tune: bool
) -> Tuple[str, Optional[dict]]:
    return name, train_stock_model(name, feat_df, tune=tune)


def train_all_models(
    features: Dict[str, pd.DataFrame],
    tune: bool = True,
    verbose: bool = True,
    n_jobs: int = 1,  # keep at 1; Optuna uses internal parallelism
) -> Dict[str, dict]:
    total = len(features)
    if verbose:
        print(f"\n{'─' * 56}")
        mode = (
            f"Optuna ({OPTUNA_N_TRIALS} trials, timeout={OPTUNA_TIMEOUT_SEC}s)"
            if (tune and OPTUNA_OK)
            else "default params"
        )
        print(f"  Training {total} XGBoost models  [{mode}]")
        print(f"{'─' * 56}")

    if n_jobs != 1:
        # parallel = no Optuna (each process can't safely share Optuna internals)
        raw = Parallel(n_jobs=n_jobs, prefer="threads")(
            delayed(_safe_train)(name, feat_df, False)
            for name, feat_df in features.items()
        )
    else:
        raw = []
        for idx, (name, feat_df) in enumerate(features.items(), 1):
            if verbose:
                print(f"  [{idx:>2}/{total}] {name:<14}", end=" … ", flush=True)
            nm, res = _safe_train(name, feat_df, tune)
            raw.append((nm, res))
            if verbose and res:
                m = res["metrics"]
                print(
                    f"RMSE={m['rmse']:.4f}  "
                    f"IC={m['ic']:+.3f}  "
                    f"DirAcc={m['dir_accuracy']:.1%}  "
                    f"Pred={res['predicted_return']:+.1%}  "
                    f"Score={res['composite_score']:+.3f}"
                )
            elif verbose:
                print("✗ FAILED")

    results = {name: res for name, res in raw if res is not None}
    if verbose:
        print(f"\n  Models trained: {len(results)}/{total}\n")
    return results


def summarise_predictions(model_results: Dict[str, dict]) -> pd.DataFrame:
    rows = []
    for name, res in model_results.items():
        m = res["metrics"]
        rows.append(
            {
                "stock": name,
                "predicted_return": res["predicted_return"],
                "composite_score": res["composite_score"],
                "ic": m["ic"],
                "dir_accuracy": m["dir_accuracy"],
                "rmse": m["rmse"],
                "n_train": m["n_train"],
            }
        )
    df = pd.DataFrame(rows).sort_values("composite_score", ascending=False)
    df.reset_index(drop=True, inplace=True)
    return df
