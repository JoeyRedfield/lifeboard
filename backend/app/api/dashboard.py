from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import analytics_service
from app.schemas.dashboard import (
    OverviewResponse,
    MonthlyTrendItem,
    CategoryBreakdownItem,
    AssetTrendItem,
)

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard/overview", response_model=OverviewResponse)
async def dashboard_overview(
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    import datetime
    now = datetime.datetime.now()
    year = year or now.year
    month = month or now.month
    return await analytics_service.get_overview(db, year, month)


@router.get(
    "/api/dashboard/trends",
    response_model=list[MonthlyTrendItem],
)
async def dashboard_trends(
    months: int = Query(default=12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_monthly_trends(db, months)


@router.get(
    "/api/dashboard/categories",
    response_model=list[CategoryBreakdownItem],
)
async def dashboard_categories(
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    import datetime
    now = datetime.datetime.now()
    year = year or now.year
    month = month or now.month
    return await analytics_service.get_category_breakdown(db, year, month)


@router.get(
    "/api/dashboard/assets",
    response_model=list[AssetTrendItem],
)
async def dashboard_assets(
    months: int = Query(default=12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_asset_trends(db, months)
