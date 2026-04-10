"""
Pydantic schemas for API request/response serialization.
"""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------
class RunSummary(BaseModel):
    """Returned by GET /runs — lightweight listing without full results."""

    id: int
    filename: str
    run_at: datetime
    contamination: float

    class Config:
        from_attributes = True


class RunDetail(RunSummary):
    """Returned by GET /runs/{run_id} — includes full scored results."""

    results: List[dict]  # parsed JSON list of scored rows


class AnalyzeResponse(BaseModel):
    """Returned by POST /analyze after a successful analysis run."""

    run_id: int
    filename: str
    contamination: float
    total_records: int
    anomalies_found: int
    anomaly_pct: float
    date_range: Optional[List[str]]  # [min_date, max_date] as ISO strings
    results: List[dict]
