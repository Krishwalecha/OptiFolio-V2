import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from api import optimize_v1 as v1


def test_cap_respects_limit_and_sums_to_one():
    w = pd.Series({"A": 0.6, "B": 0.25, "C": 0.15})
    out = v1._cap(w, 0.4)
    assert abs(out.sum() - 1) < 1e-9
    assert out.max() <= 0.4 + 1e-9
    assert out["B"] > 0.25 and out["C"] > 0.15


def test_held_frontier_counts_stocks_outside_the_candidates():
    # C was screened out by the model but is held through the even-split blend
    rng = np.random.default_rng(0)
    rets = pd.DataFrame(rng.normal(0.0005, 0.015, size=(500, 3)), columns=["A", "B", "C"])
    model_results = {s: {"predicted_return": 0.1, "metrics": {"ic": 0.2}} for s in ("A", "B")}
    w = pd.Series({"A": 0.45, "B": 0.40, "C": 0.15})
    e_ret, e_vol, mc = v1._held_frontier(w, rets, model_results, 0.03, None)
    cov = v1.covariance_matrix(["A", "B", "C"], rets).values
    assert abs(e_vol - np.sqrt(w.values @ cov @ w.values)) < 1e-9
    assert {"A", "B", "C"} <= set(mc.columns)
    assert mc["volatility"].min() - 1e-9 <= e_vol <= mc["volatility"].max() + 1e-9


def test_window_keeps_only_history_before_end():
    idx = pd.bdate_range("2015-01-01", "2026-01-01")
    df = pd.DataFrame({"Close": np.arange(len(idx), dtype=float)}, index=idx)
    out = v1._window({"A": df}, pd.Timestamp("2024-01-01"))
    assert out["A"].index.max() <= pd.Timestamp("2024-01-01")
    assert out["A"].index.min() > pd.Timestamp("2018-12-31")
