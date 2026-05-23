from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.datasources.ezbookkeeping import EzBookkeepingSource
from app.services.sync_service import full_sync

router = APIRouter(tags=["sync"])


@router.post("/sync")
async def trigger_sync(db: AsyncSession = Depends(get_db)):
    """手动触发全量同步"""
    source = EzBookkeepingSource()

    if not await source.health_check():
        return {
            "success": False,
            "error": "无法连接到 ezbookkeeping，请检查配置",
        }

    result = await full_sync(db, source)
    return {"success": True, "result": result}


@router.get("/sync/status")
async def sync_status(db: AsyncSession = Depends(get_db)):
    """获取同步状态（各表数据量）"""
    from sqlalchemy import text

    result = {}
    for table in ["accounts", "categories", "transactions"]:
        row = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
        count = row.scalar()
        result[table] = count
    return {"success": True, "result": result}
