# Forecast model

OptiFolio's return forecast is a single pooled gradient-boosted model that ranks stocks against each other over the next month. Its forecasts tilt the portfolio only in proportion to the skill the model has shown out of sample.

## How it works

1. **Data.** Ten years of daily prices for a 30-stock NSE reference universe plus the user's own stocks, and the Nifty 50.
2. **Features.** About 60 per stock per day: trend (price versus moving averages), momentum (returns over 1 day to 12 months, 12-1 momentum), oscillators (RSI, MACD, stochastics, CCI, Williams %R), volatility (realised, Parkinson, ATR, Bollinger width), volume flow (OBV, MFI, CMF), relative strength versus the Nifty 50 and a rolling 126-day beta. Market context (Nifty trend, volatility and distance from its 200-day average) is added unranked.
3. **Cross-sectional ranking.** Every feature is converted to a percentile rank across stocks on each date, so the model learns which stocks will do better than the rest rather than predicting the market's direction.
4. **Target.** The next 21 trading days' log return minus that day's cross-sectional average, clipped at the 1st and 99th percentiles.
5. **Model.** One XGBoost regressor trained on the pooled panel (about 68,000 stock-days, sampled every second trading day), deliberately shallow and heavily regularised: depth 3, learning rate 0.03, 350 trees, `min_child_weight` 60.
6. **No leakage.** For a prediction on day *t*, the model is trained only on rows whose 21-day outcome was known by *t*.

## Turning a forecast into an allocation

- Each stock's baseline expected return is 70% CAPM (risk-free rate plus beta times a 6% equity premium) and 30% its own five-year history.
- The model adds an alpha of `IC × dispersion × z × 12`, following Grinold's fundamental law. *z* is the stock's standardised model score, *dispersion* is the typical spread of monthly returns across stocks, and *IC* is the model's measured out-of-sample skill over the last 36 months.
- That IC is halved and capped at 0.10 to allow for estimation error. If the recent skill is not statistically significant (t below 1.5), the model is switched off and the allocation uses risk and history alone.
- The covariance matrix uses Ledoit-Wolf shrinkage. The optimiser then solves minimum variance (conservative), maximum Sharpe (balanced) or mean-variance utility (aggressive), within the user's weight limits.

## Benchmark

_The pooled v2 engine and its research scripts described in this section were removed once the per-stock engine was chosen; the results are kept as a record._

`research/benchmark.py` and `research/tune_pooled.py` evaluate each approach walk-forward. On each test date, the model is trained only on the past, predicts the next month for every stock, and is scored on the cross-sectional rank correlation (IC) between prediction and outcome, plus the return spread between its top and bottom fifths.

**Five years of data, 24 monthly tests, 28 stocks**

| Model | Mean IC | t-stat | Top − bottom per month | Months positive |
|---|---|---|---|---|
| Historical mean return (previous baseline) | −0.027 | −0.59 | −0.75% | 29% |
| 12-1 momentum | 0.009 | 0.21 | −0.03% | 38% |
| Previous per-stock XGBoost | 0.038 | 1.00 | −0.04% | 42% |
| Pooled model (first version) | 0.061 | 1.36 | +1.50% | 63% |

**Ten years of data, 60 non-overlapping monthly tests, 30 stocks (tuning)**

| Variant | Mean IC | t-stat | Top − bottom per month | Months positive |
|---|---|---|---|---|
| XGBoost + ridge, rank target | 0.057 | 2.06 | +0.54% | 55% |
| Ridge only | 0.037 | 1.32 | +0.41% | 50% |
| Last 3 years of training only | 0.027 | 1.04 | +1.04% | 60% |
| **XGBoost, raw target (chosen)** | **0.072** | **2.85** | **+0.87%** | **63%** |

A three-month horizon showed a similar IC (0.079 over 28 non-overlapping quarters) but weaker statistical significance, so the one-month model was kept. Its monthly forecast also pairs with the rebalance check.

## Honest limits

- An IC of about 0.07 means the model is right more often than chance at ranking stocks, not that it predicts prices. Individual months are frequently wrong.
- The backtest in each result holds weights chosen one year ago, using only data available then. It is one historical path, not a guarantee.
- Nothing here is investment advice.

## Resampled allocation

A single mean-variance solve treats small differences in expected return as certain, so it pushes the top few stocks to the weight cap and leaves the rest at the floor (for example 28 / 28 / 28 / 10 / 3 / 3). Balanced and Aggressive now average 48 solves, each on expected returns drawn from N(mu, 0.05 × Σ) (Michaud resampling). Conservative (minimum variance) does not use expected returns and is unchanged.

Out of sample, over 19 quarterly rebalances across 12 random six-stock baskets from the reference universe (research/resample_test.py):

| Profile | Method | Return | Vol | Sharpe | Avg max weight | Turnover |
|---|---|---|---|---|---|---|
| Balanced | single solve | 8.6% | 15.4% | 0.12 | 27.8% | 8.8% |
| Balanced | resampled | 9.9% | 14.8% | 0.21 | 22.3% | 6.0% |
| Aggressive | single solve | 8.4% | 16.3% | 0.10 | 33.9% | 12.0% |
| Aggressive | resampled | 9.9% | 15.1% | 0.21 | 24.0% | 7.8% |
| Conservative | min variance | 10.1% | 14.5% | 0.23 | 20.0% | 0.9% |

Conservative weights often sit exactly at the 20% cap. That is the cap binding, not a bug: with six stocks, minimum variance wants more than 20% in the steadiest names.

## Limits that scale with portfolio size

A fixed per-stock cap forces equal weights on small portfolios: three stocks under a 28% cap can only be 33/33/33, and five under 20% can only be 20 each. The default cap is now the larger of the profile cap and k / n (k = 1.6 conservative, 2.0 balanced, 2.5 aggressive), at most 75%; the default floor is the smaller of the profile floor and 0.5 / n. User-set limits are used as given.

Honest note: in out-of-sample tests on 3-stock baskets, equal weight had a slightly higher Sharpe (0.24) than the scaled-cap optimizer (about 0.20), and across 3, 6 and 10 stocks equal weight was not beaten by any optimized variant (research/vs_equal_v2.log). Every result page compares the method against equal weight over the past year so users can see this.

## Current setting (30 September 2026)

The app runs the original single-solve optimizer with fixed per-stock limits (4-20%, 3-28%, 2-35%). Resampling, size-scaled limits and the equal-weight blend were tested and are kept in `services/allocator.py` for research (`resampled`, `limits`, `allocate`), but are not used by `/api/optimize`.

## Engine switch (30 September 2026)

`/api/optimize` now runs the original per-stock engine (`api/optimize_v1.py`: one XGBoost model per stock, composite-score weighting). Changes from the committed original: stocks without enough price history are no longer passed to the optimizer (this crashed runs with recently listed stocks such as MAZDOCK), a portfolio can no longer collapse into a single stock, user min/max limits are applied, and every result includes a one-year point-in-time test (models retrained on data up to a year earlier).

Point-in-time comparison, Balanced, 8 baskets x 5 start dates (Sep 2023 to Sep 2025), 12-month holds:

| | Avg 12-month return | Median | Beat Nifty |
|---|---|---|---|
| Original engine (fixed) | 8.86% | 4.53% | 24 / 40 |
| Pooled v2 engine | 8.82% | 1.88% | |
| Equal weight | 8.73% | 1.86% | |
| Nifty 50 | 4.70% | | |

On 36 large-cap baskets the original led (9.3% vs 6.8% for v2); on a basket with two defence stocks it missed the 2023-24 rally. Overall the difference from v2 and from equal weight is not statistically significant. The pooled v2 engine (`api/optimize.py`, `services/forecaster.py`, `services/allocator.py`) is kept for research; its daily warm-up runs only when `WARM_V2_MODEL=1`.

## Skill-aware confidence (30 September 2026)

The per-stock composite score is predicted return times confidence. Confidence used to floor a negative IC at zero and itself at 0.25, so a model that predicted backwards in testing still got a quarter of full trust. It now lets a negative IC lower confidence, down to a floor of 0.05.

Point-in-time test: 8 six-stock and 8 three-stock baskets, 5 start dates (Sep 2023 to Sep 2025), 12-month holds, models trained only on data before each start.

| Profile, basket size | Avg return before / after | Worst 10% before / after |
|---|---|---|
| Balanced, 3 | 8.51% / 9.70% | -15.62% / -15.56% |
| Balanced, 6 | 11.68% / 12.19% | -7.99% / -6.90% |
| Conservative, 3 | 7.75% / 8.20% | -16.51% / -16.59% |
| Conservative, 6 | 10.65% / 10.85% | -10.51% / -9.53% |

Aggressive weights by expected return, not the composite score, so it is unchanged. Per-profile maximum weights (30/40/50%) were tested at the same time and rejected: they lowered Balanced three-stock returns (8.51% to 7.69%) without improving six-stock results.

With skill-aware confidence the same 40-test Balanced evaluation gives: average 9.01% (was 8.86%), median 2.78% (was 4.53%), beat the Nifty 24/40, beat equal weight 21/40 (was 24/40). Equal weight 8.73%, Nifty 4.70%.

## Round 2 (30 September 2026): fresh features, momentum, size-aware blend

Point-in-time test: 8 six-stock and 8 three-stock baskets, 7 start dates (Sep 2022 to Sep 2025, so the 2022 fall is included), all three profiles, 12-month holds. 336 tests.

Found and fixed: the per-stock models forecast from the last row that had a known 21-day-ahead target, i.e. features from 21 trading days before the latest price. They now forecast from the latest day, and a 21-day gap separates training rows from test rows so the measured IC is not inflated (`MODEL_FRESH_FEATURES`). Alone: median 11.9% to 12.8%, worst 10% -12.6% to -11.3%, average +0.24 pts.

Rejected: dividing weights by volatility (-0.72 pts, t = -5.4); keeping model-rejected stocks at the minimum weight (mixed).

Shipped on top of the fresh features (`api/optimize_v1.py`):
- Momentum tilt: weights x exp(0.35 z), z = 12-month return skipping the last month, standardised across the basket.
- Size-aware blend with an even split of all the user's stocks: share = clip((n - 3) / 6, 0, 0.5).

Package versus the previous live engine: +1.59 pts a year on average (t = 3.94, better in 183 of 336 tests). Three stocks: average 14.7% to 15.5%, worst 10% -14.3% to -13.6%, median 9.8% to 8.4%. Six stocks: average 19.1% to 21.4%, median 15.0% to 16.8%, worst 10% -6.8% to -6.2%, beat the Nifty 121 to 140 of 168. It does not win on every basket.

## Out-of-sample check and round 3 (30 September 2026)

Fresh baskets the engine was never tuned on: 23 baskets of 3 to 6 stocks (new random seed, plus COCHINSHIP/HDFCBANK/INFY/SBIN/TCS), 7 start dates, 3 profiles, 483 one-year point-in-time tests.

| | avg | median | worst 10% | beat even split |
|---|---|---|---|---|
| Live engine | 14.59% | 10.06% | -9.19% | 306 of 483 |
| Even split | 13.73% | 8.53% | -8.15% | |

The live engine held up out of sample: +0.86 pts a year over an even split, winning 63% of tests. Four candidate changes were tested against it and all were rejected:

| Candidate | vs live | t |
|---|---|---|
| Momentum scaled by volatility | -0.14 pts | -5.9 |
| Cap each stock at 40% of portfolio risk | -0.36 pts | -2.6 |
| Blend toward even split when basket IC is low | -0.22 pts | -1.7 |
| Both of the first two | -0.44 pts | -3.1 |

The risk cap and IC blend improve the worst tests slightly but cost more on average. No change shipped.

## Round 4 (30 September 2026): history length and momentum strength

Two more fresh basket sets (seeds 777 and 4242, 483 tests each), plus a repeat on the seed 2026 set.

History used for training (seed 777):

| | avg | beat even split |
|---|---|---|
| 5 years (live) | 15.15% | 262 of 483 |
| 7 years | 12.27% | 180 |
| 10 years | 12.46% | 195 |

More history costs about 2.7 to 2.9 pts a year (t about -8). Older regimes hurt the per-stock models. Kept at 5 years.

Momentum strength, pooled over seeds 4242 and 2026 (966 tests):

| | vs live | t | worst 10% | beat even split |
|---|---|---|---|---|
| 0.6 | +0.26 pts | 4.4 | -0.44 pts | 590 vs 594 |
| 0.9 | +0.56 pts | 4.5 | -1.05 pts | 577 vs 594 |
| 12-1 plus 6-1 blend | -0.22 to -0.26 pts | | worse | |

Stronger momentum raises the average only by concentrating more, which lowers the median, worsens the worst years and beats an even split less often. Rejected; 0.35 stays. The live engine beat an even split in all four fresh sets (+0.9 to +1.3 pts a year).

## Round 5 (30 September 2026): the ±50% forecast cap

The model forecasts 21 trading days ahead; that figure is multiplied by 12 and clipped at ±50%. 82 of 728 forecasts (11%) hit the cap in a fresh set (seed 99, 483 tests). Alternatives, recomputed from the same raw forecasts:

| | vs live | avg | median |
|---|---|---|---|
| Smooth tanh squash at 50% | -0.07 pts | 18.58% | 11.44% |
| Cap at 75% | +0.05 pts | 18.70% | 11.56% |
| No cap (3 sigma clip only) | +0.07 pts | 18.72% | 11.56% |
| Live (cap 50%) | | 18.65% | 11.93% |

Differences are under a tenth of a point with a lower median, so the cap stays. The results page now shows the raw one-month forecast ("Next month") instead of the annualised, capped number.

## Round 6 (30 September 2026): new price signals

Pooled over seeds 99 and 4242 (966 tests; the Nifty was below its 200-day average at 29% of start dates).

| Candidate | vs live | t | worst 10% | median |
|---|---|---|---|---|
| 52-week-high proximity instead of 12-1 momentum | -0.18 pts | -2.0 | +0.10 | -0.44 |
| Average of 12-1 momentum and 52-week-high proximity | -0.10 pts | -2.0 | +0.11 | -0.24 |
| 50% inverse volatility when Nifty < 200-day average | -0.56 pts | -9.1 | -0.23 | -0.59 |
| No momentum tilt when Nifty < 200-day average | -0.14 pts | -2.7 | -0.23 | +0.17 |

All rejected. Summary of rounds 3 to 6: across four independent fresh basket sets (1,932 tests, 89 baskets) the live engine returned 16.1% a year against 15.0% for an even split (t 7.3), ahead in 59% of tests, with a slightly deeper worst decile (-8.6% against -8.1%). No price-only change tested so far improves on it.

## Round 7 (30 September 2026): forecast horizon and market-relative target

Pooled over seeds 99 and 4242 (966 tests), each variant retrained point in time.

| Target | vs live | t | worst 10% | median | mean IC |
|---|---|---|---|---|---|
| 21-day return (live) | | | | | 0.05 |
| 63-day return | -1.10 pts | -5.3 | -0.33 | -0.87 | 0.16 |
| 21-day return minus Nifty | -0.12 pts | -0.6 | -1.08 | +0.79 | 0.03 |
| 63-day return minus Nifty | -0.73 pts | -3.0 | -0.68 | -1.57 | 0.13 |

The 63-day models score a much higher IC, but overlapping 63-day labels inflate it and the portfolios they produce are worse. All rejected; the 21-day target stays.
