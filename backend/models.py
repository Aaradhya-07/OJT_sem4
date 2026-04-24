"""
Pydantic schemas for API request/response serialization.
"""

from datetime import datetime
from typing import Any, List, Optional, Union

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------
class RunSummary(BaseModel):
    """Returned by GET /runs — lightweight listing without full results."""

    id: int
    filename: str
    run_at: datetime
    contamination: Union[str, float]

    class Config:
        from_attributes = True


class RunDetail(RunSummary):
    """Returned by GET /runs/{run_id} — includes full scored results."""

    results: List[dict]  # parsed JSON list of scored rows


class AnalyzeResponse(BaseModel):
    """Returned by POST /analyze after a successful analysis run."""

    run_id: int
    filename: str
    contamination: Union[str, float]
    total_records: int
    anomalies_found: int
    anomaly_pct: float
    date_range: Optional[List[str]]  # [min_date, max_date] as ISO strings
    score_distribution: Optional[List[dict]] = None
    results: List[dict]


# ---------------------------------------------------------------------------
# New Feature Response schemas
# ---------------------------------------------------------------------------
class HeatmapCell(BaseModel):
    date: str
    hour: int
    anomaly_count: int
    worst_score: float

class RerunRequest(BaseModel):
    run_id: int
    contamination: float

class SensorHealth(BaseModel):
    sensor: str
    anomaly_rate: float
    status: str
    worst_value: float


# ---------------------------------------------------------------------------
# Gemini AI Insight schemas
# ---------------------------------------------------------------------------
class CriticalEvent(BaseModel):
    datetime: str
    co: float
    nox: float
    score: float

class FeatureStat(BaseModel):
    sensor: str
    normal_mean: float
    anomaly_mean: float
    ratio: float

class InsightRequest(BaseModel):
    total_records: int
    anomaly_count: int
    anomaly_pct: float
    date_range: str
    selected_time_window: str
    top_critical_events: List[CriticalEvent]
    feature_comparison: List[FeatureStat]
    most_anomalous_sensor: str
