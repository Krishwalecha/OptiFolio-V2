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


def test_window_keeps_only_history_before_end():
    idx = pd.bdate_range("2015-01-01", "2026-01-01")
    df = pd.DataFrame({"Close": np.arange(len(idx), dtype=float)}, index=idx)
    out = v1._window({"A": df}, pd.Timestamp("2024-01-01"))
    assert out["A"].index.max() <= pd.Timestamp("2024-01-01")
    assert out["A"].index.min() > pd.Timestamp("2018-12-31")
