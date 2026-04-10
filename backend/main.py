"""
FastAPI application for the Air Quality Anomaly Detection system.

Endpoints:
    POST /analyze       — upload CSV + contamination param, run Isolation Forest
    GET  /runs          — list all past analysis runs
    GET  /runs/{run_id} — retrieve full results for a specific run
"""

import json
import traceback

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, Run, engine, get_db
from ml import preprocess_csv, run_isolation_forest
from models import AnalyzeResponse, RunDetail, RunSummary

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
    contamination: float = Form(0.05),
    db: Session = Depends(get_db),
):
    """Upload a CSV file and run Isolation Forest anomaly detection.

    - **file**: UCI Air Quality CSV (semicolon-delimited, European decimals).
    - **contamination**: Expected anomaly fraction (0.01 – 0.50, default 0.05).
    """
    # ---- Validate contamination ----
    if not (0.001 <= contamination <= 0.50):
        raise HTTPException(
            status_code=422,
            detail="contamination must be between 0.001 and 0.50",
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
