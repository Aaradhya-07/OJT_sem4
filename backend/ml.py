"""
Machine-learning pipeline for Air Quality anomaly detection.

Mirrors the approach in the reference notebook:
  1. Load UCI Air Quality CSV (semicolon delimiter, European decimal comma).
  2. Drop the two trailing empty columns.
  3. Replace −200 sentinel values with NaN.
  4. Select reference-analyser features:
       CO(GT), C6H6(GT), NOx(GT), NO2(GT), T, RH, AH
  5. Drop rows with any remaining NaN (no forward-fill).
  6. StandardScaler → Isolation Forest → score_samples.
"""

import io
from typing import List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Feature columns — same as the reference notebook
# ---------------------------------------------------------------------------
FEATURE_COLS: List[str] = [
    "CO(GT)",
    "C6H6(GT)",
    "NOx(GT)",
    "NO2(GT)",
    "T",
    "RH",
    "AH",
]


# ---------------------------------------------------------------------------
# CSV Preprocessing (matches reference notebook)
# ---------------------------------------------------------------------------
def preprocess_csv(file_bytes: bytes) -> pd.DataFrame:
    """Read and clean the UCI Air Quality CSV.

    Steps (identical to the reference notebook):
      1. ``pd.read_csv(sep=';', decimal=',')``
      2. Drop the last two unnamed/empty columns.
      3. Replace every ``-200`` with ``NaN``.
      4. Parse Datetime from Date + Time using ``format='%d/%m/%Y %H.%M.%S'``.
      5. Select only the 7 feature columns + keep Datetime for charting.
      6. Drop any row that still contains NaN in the feature columns.

    Returns a cleaned DataFrame sorted by Datetime.

    Raises:
        ValueError: if required columns are missing after parsing.
    """
    # ---- Read CSV ----
    try:
        df = pd.read_csv(
            io.BytesIO(file_bytes),
            sep=";",
            decimal=",",
            na_values="",
            on_bad_lines="skip",
        )
        if any(c not in df.columns for c in FEATURE_COLS):
            df_comma = pd.read_csv(io.BytesIO(file_bytes), on_bad_lines="skip")
            if all(c in df_comma.columns for c in FEATURE_COLS):
                df = df_comma
    except Exception:
        # Fallback: comma-separated
        df = pd.read_csv(io.BytesIO(file_bytes), on_bad_lines="skip")

    # ---- Drop last 2 unnamed / fully-empty trailing columns ----
    df = df.loc[:, ~df.columns.str.startswith("Unnamed")]
    df.dropna(axis=1, how="all", inplace=True)

    # ---- Replace -200 sentinel with NaN ----
    df.replace(-200, np.nan, inplace=True)
    df.replace(-200.0, np.nan, inplace=True)

    # ---- Validate required feature columns ----
    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        raise ValueError(
            f"CSV is missing required columns: {missing}. "
            f"Found columns: {list(df.columns)}"
        )

    # ---- Build Datetime column (format from notebook: %d/%m/%Y %H.%M.%S) ----
    if "Date" in df.columns and "Time" in df.columns:
        df["datetime"] = pd.to_datetime(
            df["Date"].astype(str) + " " + df["Time"].astype(str),
            format="%d/%m/%Y %H.%M.%S",
            errors="coerce",
        )
    else:
        df["datetime"] = pd.NaT

    # ---- Select feature columns + datetime ----
    keep_cols = FEATURE_COLS + ["datetime"]
    df = df[[c for c in keep_cols if c in df.columns]].copy()

    # ---- Drop rows with any NaN in feature columns (no forward-fill) ----
    df.dropna(subset=FEATURE_COLS, inplace=True)
    df.reset_index(drop=True, inplace=True)

    # ---- Sort by datetime if available ----
    if "datetime" in df.columns:
        df.sort_values("datetime", inplace=True)
        df.reset_index(drop=True, inplace=True)

    return df


# ---------------------------------------------------------------------------
# Isolation Forest Pipeline (matches reference notebook)
# ---------------------------------------------------------------------------
from typing import Union

def run_isolation_forest(
    df: pd.DataFrame,
    contamination: Union[float, str] = "auto",
) -> Tuple[pd.DataFrame, dict]:
    """Run Isolation Forest on the preprocessed data.

    Matches the reference notebook:
      - StandardScaler on the 7 feature columns.
      - IsolationForest(n_estimators=100, contamination=<param>, random_state=42).
      - ``predict()`` → 1 = normal, -1 = anomaly  →  mapped to ``is_anomaly`` 0/1.
      - ``score_samples()`` → anomaly_score (lower = more anomalous).

    Returns:
        (scored_df, summary_dict)
    """
    features = df[FEATURE_COLS].copy()

    # ---- Scale features ----
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    # ---- Fit Isolation Forest ----
    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
    )
    model.fit(X_scaled)

    # ---- Predict & score (same as notebook) ----
    predictions = model.predict(X_scaled)          # +1 normal, -1 anomaly
    scores = model.score_samples(X_scaled)          # lower = more anomalous

    # ---- Attach results ----
    result_df = df.copy()
    result_df["is_anomaly"] = (predictions == -1).astype(int)   # 1 = anomaly, 0 = normal
    result_df["anomaly_score"] = scores

    # Add z-scores
    for i, col in enumerate(FEATURE_COLS):
        result_df[f"{col}_zscore"] = X_scaled[:, i]

    # Add severity tier
    def get_tier(score, is_anom):
        if not is_anom:
            return "Normal"
        if score < -0.20:
            return "Critical"
        elif score <= -0.10:
            return "Moderate"
        elif score <= -0.05:
            return "Minor"
        else:
            # Fallback if anomaly but small negative score
            return "Minor"
            
    result_df["severity_tier"] = result_df.apply(lambda row: get_tier(row["anomaly_score"], row["is_anomaly"]), axis=1)

    # ---- Summary ----
    total = len(result_df)
    anomalies = int(result_df["is_anomaly"].sum())
    date_range = None
    if "datetime" in result_df.columns and result_df["datetime"].notna().any():
        date_range = [
            result_df["datetime"].min().isoformat(),
            result_df["datetime"].max().isoformat(),
        ]

    # Calculate score distribution
    hist, bin_edges = np.histogram(scores, bins=40)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
    score_distribution = [{"score": round(float(cen), 3), "count": int(cnt)} for cen, cnt in zip(bin_centers, hist)]

    summary = {
        "total_records": total,
        "anomalies_found": anomalies,
        "anomaly_pct": round(anomalies / total * 100, 2) if total > 0 else 0.0,
        "date_range": date_range,
        "score_distribution": score_distribution,
    }

    return result_df, summary
