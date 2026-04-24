"""
FastAPI application for the Air Quality Anomaly Detection system.

Endpoints:
    POST /analyze       — upload CSV + contamination param, run Isolation Forest
    GET  /runs          — list all past analysis runs
    GET  /runs/{run_id} — retrieve full results for a specific run
"""

import json
import traceback

import os
import google.generativeai as genai
import google.api_core.exceptions
from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Union
from sqlalchemy.orm import Session

from database import Base, Run, engine, get_db
from ml import preprocess_csv, run_isolation_forest
from models import AnalyzeResponse, RunDetail, RunSummary, InsightRequest

# Configure Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Air Quality Anomaly Detection API",
    description="Isolation-Forest-powered anomaly detection on UCI Air Quality data.",
    version="1.0.0",
)

# CORS — allow Streamlit (typically localhost:8501) and any local origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables exist
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# POST /analyze
# ---------------------------------------------------------------------------
@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    file: UploadFile = File(...),
    contamination: Union[str, float] = Form("auto"),
    db: Session = Depends(get_db),
):
    """Upload a CSV file and run Isolation Forest anomaly detection.

    - **file**: UCI Air Quality CSV (semicolon-delimited, European decimals).
    - **contamination**: Expected anomaly fraction (0.01 – 0.50, default or "auto").
    """
    # ---- Validate contamination ----
    if contamination != "auto":
        try:
            contamination = float(contamination)
            if not (0.001 <= contamination <= 0.50):
                raise ValueError()
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail="contamination must be 'auto' or a float between 0.001 and 0.50",
            )

    # ---- Read uploaded bytes ----
    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.")

    # ---- Preprocess ----
    try:
        df = preprocess_csv(contents)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse CSV. Ensure it uses the UCI Air Quality format. Error: {traceback.format_exc(limit=2)}",
        )

    if df.empty:
        raise HTTPException(
            status_code=422,
            detail="No valid records remain after preprocessing. Check your CSV.",
        )

    # ---- Run Isolation Forest ----
    try:
        scored_df, summary = run_isolation_forest(df, contamination=contamination)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=f"Model scoring failed: {traceback.format_exc(limit=2)}",
        )

    # ---- Serialize results ----
    # Convert datetime columns to ISO strings for JSON compatibility
    for col in scored_df.select_dtypes(include=["datetime64[ns]", "datetimetz"]).columns:
        scored_df[col] = scored_df[col].dt.strftime("%Y-%m-%dT%H:%M:%S")

    results = scored_df.to_dict(orient="records")
    results_json = json.dumps(results, default=str)

    # ---- Persist to SQLite ----
    run = Run(
        filename=file.filename or "unknown.csv",
        contamination=contamination,
        results_json=results_json,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return AnalyzeResponse(
        run_id=run.id,
        filename=run.filename,
        contamination=contamination,
        total_records=summary["total_records"],
        anomalies_found=summary["anomalies_found"],
        anomaly_pct=summary["anomaly_pct"],
        date_range=summary["date_range"],
        score_distribution=summary.get("score_distribution"),
        results=results,
    )


# ---------------------------------------------------------------------------
# GET /runs
# ---------------------------------------------------------------------------
@app.get("/runs", response_model=list[RunSummary])
def list_runs(db: Session = Depends(get_db)):
    """List all past analysis runs (without full results)."""
    runs = db.query(Run).order_by(Run.run_at.desc()).all()
    return runs


# ---------------------------------------------------------------------------
# GET /runs/{run_id}
# ---------------------------------------------------------------------------
@app.get("/runs/{run_id}", response_model=RunDetail)
def get_run(run_id: int, db: Session = Depends(get_db)):
    """Retrieve the full scored results for a specific past run."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")

    try:
        results = json.loads(run.results_json)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Stored results for run {run_id} are corrupted.",
        )

    return RunDetail(
        id=run.id,
        filename=run.filename,
        run_at=run.run_at,
        contamination=run.contamination,
        results=results,
    )


# ---------------------------------------------------------------------------
# NEW DASHBOARD ENDPOINTS
# ---------------------------------------------------------------------------
import pandas as pd
from datetime import datetime, timedelta

def get_run_results_df(db: Session, run_id: int = None):
    query = db.query(Run)
    if run_id:
        run = query.filter(Run.id == run_id).first()
    else:
        run = query.order_by(Run.run_at.desc()).first()
        
    if not run:
        raise HTTPException(status_code=404, detail="No analysis run found.")
        
    results = json.loads(run.results_json)
    df = pd.DataFrame(results)
    if "datetime" in df.columns:
        df["datetime"] = pd.to_datetime(df["datetime"])
    return run, df


@app.get("/anomaly-context")
def get_anomaly_context(timestamp: str, window_hours: int = 3, run_id: int = None, db: Session = Depends(get_db)):
    """Returns sliced sensor data +/- window_hours around a given timestamp."""
    _, df = get_run_results_df(db, run_id)
    
    ts = pd.to_datetime(timestamp)
    start_time = ts - timedelta(hours=window_hours)
    end_time = ts + timedelta(hours=window_hours)
    
    # Filter by time window
    sliced = df[(df["datetime"] >= start_time) & (df["datetime"] <= end_time)].copy()
    
    # We also need to compute 24h rolling mean for the specific timestamp
    dev_start = ts - timedelta(hours=24)
    past_24h = df[(df["datetime"] >= dev_start) & (df["datetime"] <= ts)]
    means = past_24h.mean(numeric_only=True)
    
    # Get exact row at timestamp
    exact_row = df[df["datetime"] == ts]
    if exact_row.empty:
        raise HTTPException(status_code=404, detail="Timestamp not found in data.")
        
    exact_row = exact_row.iloc[0]
    
    # Build comparison table data for all sensors
    # Features are specifically the ones with zscores
    features = [c.replace("_zscore", "") for c in df.columns if c.endswith("_zscore")]
    
    comparisons = []
    for f in features:
        curr_val = float(exact_row[f]) if pd.notna(exact_row[f]) else 0.0
        rolling_mean = float(means[f]) if f in means and pd.notna(means[f]) else 0.0
        comparisons.append({
            "sensor": f,
            "value": curr_val,
            "mean_24h": rolling_mean,
            "deviation": curr_val - rolling_mean
        })
        
    # Serialize datetime for JSON
    sliced["datetime"] = sliced["datetime"].dt.strftime("%Y-%m-%dT%H:%M:%S")
    
    return {
        "chart_data": sliced.to_dict(orient="records"),
        "comparison_table": comparisons
    }

@app.get("/heatmap-data")
def get_heatmap_data(run_id: int = None, db: Session = Depends(get_db)):
    """Returns aggregated anomaly counts and worst scores per day/hour."""
    _, df = get_run_results_df(db, run_id)
    
    if "datetime" not in df.columns:
        return []
        
    df["date"] = df["datetime"].dt.strftime("%Y-%m-%d")
    df["hour"] = df["datetime"].dt.hour
    
    grouped = df.groupby(["date", "hour"]).agg(
        anomaly_count=("is_anomaly", "sum"),
        worst_score=("anomaly_score", "min")
    ).reset_index()
    
    return grouped.to_dict(orient="records")

@app.post("/rerun-analysis")
def rerun_analysis(run_id: int, contamination: float, db: Session = Depends(get_db)):
    """Re-runs Isolation Forest on a past run with a new contamination threshold."""
    # Note: Because the DB only stores `results_json`, we must parse it, 
    # extract original features, and re-run.
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
        
    df = pd.DataFrame(json.loads(run.results_json))
    if "datetime" in df.columns:
        df["datetime"] = pd.to_datetime(df["datetime"])
        
    from ml import FEATURE_COLS
    # Keep only relevant columns to avoid passing anomalies
    keep_cols = FEATURE_COLS + ["datetime"]
    df_clean = df[[c for c in keep_cols if c in df.columns]].copy()
    
    try:
        from ml import run_isolation_forest
        scored_df, summary = run_isolation_forest(df_clean, contamination=contamination)
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Model scoring failed: {traceback.format_exc(limit=2)}",
        )
        
    # Serialize datetime
    for col in scored_df.select_dtypes(include=["datetime64[ns]", "datetimetz"]).columns:
        scored_df[col] = scored_df[col].dt.strftime("%Y-%m-%dT%H:%M:%S")

    results = scored_df.to_dict(orient="records")
    
    # Update DB
    run.contamination = contamination
    run.results_json = json.dumps(results, default=str)
    db.commit()
    
    # Format distribution
    dist = summary.get("score_distribution")
    
    return {
        "run_id": run.id,
        "anomalies_found": summary["anomalies_found"],
        "anomaly_pct": summary["anomaly_pct"],
        "score_distribution": dist,
        "results": results,
    }

@app.get("/sensor-health")
def get_sensor_health(run_id: int = None, db: Session = Depends(get_db)):
    """Returns anomaly rates and worst value per sensor feature."""
    _, df = get_run_results_df(db, run_id)
    
    # For each anomaly, assign it to the sensor with the highest absolute z-score
    features = [c.replace("_zscore", "") for c in df.columns if c.endswith("_zscore")]
    z_cols = [f"{f}_zscore" for f in features]
    
    anomalies_idx = df["is_anomaly"] == 1
    df_anom = df[anomalies_idx]
    
    sensor_stats = []
    
    if len(df_anom) > 0:
        # Find dominant feature per anomaly
        # Using abs() because extreme negative or positive are both anomalies
        dominant_idx = df_anom[z_cols].abs().idxmax(axis=1)
        # Count occurrences of each feature name (stripping '_zscore')
        dominant_counts = dominant_idx.apply(lambda x: x.replace("_zscore", "")).value_counts()
    else:
        dominant_counts = pd.Series(dtype=int)
        
    total_readings = len(df)
    if total_readings == 0:
        total_readings = 1 # Avoid division by zero
        
    for feature in features:
        # Number of anomalies where this feature was the primary contributor
        Feature_anomalies = int(dominant_counts.get(feature, 0))
        anomaly_rate = (Feature_anomalies / total_readings) * 100
        
        # Calculate worst value: value at the instance with the most extreme z-score
        if len(df) > 0:
            max_z_idx = df[f"{feature}_zscore"].abs().idxmax()
            worst_value = float(df.loc[max_z_idx, feature])
        else:
            worst_value = 0.0
            
        status = "emerald" # < 5%
        if anomaly_rate >= 15:
            status = "rose"
        elif anomaly_rate >= 5:
            status = "amber"
            
        sensor_stats.append({
            "sensor": feature,
            "anomaly_rate": round(anomaly_rate, 2),
            "status": status,
            "worst_value": round(worst_value, 2)
        })
        
    return sensor_stats


# ---------------------------------------------------------------------------
# POST /insight
# ---------------------------------------------------------------------------
@app.post("/insight")
async def generate_insight(req: InsightRequest):
    """Generate AI insights based on the analysis results using Gemini."""
    
    # Reload dotenv in case it changed
    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable not set")
        
    genai.configure(api_key=api_key)
    
    # Format sensor insights
    sensor_details = ""
    for stat in req.feature_comparison:
        sensor_details += f"- SENSOR {stat.sensor}: normal avg = {stat.normal_mean:.2f}, anomaly avg = {stat.anomaly_mean:.2f} ({stat.ratio:.2f}x higher)\n"
    
    # Format top events
    events_details = ""
    for ev in req.top_critical_events[:3]:
        events_details += f"- {ev.datetime}: CO={ev.co}, NOx={ev.nox}, Score={ev.score:.3f}\n"

    prompt = f"""You are an air quality data analyst. A user has run anomaly detection 
on an urban air quality dataset. Here are the results:

Dataset: {req.total_records} hourly readings from {req.date_range}.
Anomalies detected: {req.anomaly_count} ({req.anomaly_pct}%) using Isolation Forest.
Time window currently viewed: {req.selected_time_window}.

Sensor behavior during anomalies vs normal readings:
{sensor_details}

Top 3 most critical events (lowest anomaly scores):
{events_details}

Based on this data, provide:
1. A 2-sentence plain-English summary of what the anomalies represent 
   (high pollution events, sensor faults, weather patterns, etc.)
2. Which sensors are the primary drivers of anomalies and why that matters
3. The time periods of highest concern and what may have caused them 
   (traffic, industrial activity, seasonal patterns)
4. One actionable recommendation for what a city environmental officer 
   should do with this information

Be specific, cite the actual numbers from the data, and keep the total 
response under 250 words. Do not use excessive bullet points — write 
in short readable paragraphs."""

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            prompt, 
            stream=True, 
            request_options={"retry": None}
        )
        
        async def event_generator():
            try:
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
            except Exception as e:
                yield f"\n\n[Error streaming response: {str(e)}]"
                        
        return StreamingResponse(event_generator(), media_type="text/plain")
        
    except google.api_core.exceptions.ResourceExhausted as e:
        import re
        retry_delay = 60
        m = re.search(r'in (\d+)s', str(e))
        if m:
            retry_delay = int(m.group(1))
        raise HTTPException(status_code=429, detail={"message": str(e), "retry_delay": retry_delay})
    except Exception as e:
        if "429" in str(e) or getattr(e, "code", None) == 429:
            raise HTTPException(status_code=429, detail={"message": str(e), "retry_delay": 60})
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Gemini API: {str(e)}")
