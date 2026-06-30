import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import async_session
from app.datasources.ezbookkeeping import EzBookkeepingSource
from app.services.sync_service import full_sync

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_scheduler():
    if not settings.ezbookkeeping_base_url or not settings.ezbookkeeping_token:
        logger.warning("ezbookkeeping 未配置，跳过定时同步")
        return
    if scheduler.running:
        logger.info("定时同步已在运行，跳过重复启动")
        return

    @scheduler.scheduled_job(
        "interval",
        minutes=settings.sync_interval_minutes,
        id="sync_ezbookkeeping",
    )
    async def scheduled_sync():
        async with async_session() as db:
            source = EzBookkeepingSource()
            try:
                result = await full_sync(db, source)
                logger.info("定时同步完成: %s", result)
            except Exception as e:
                logger.error("定时同步失败: %s", e)

    scheduler.start()
    logger.info("定时同步已启动，间隔 %d 分钟", settings.sync_interval_minutes)


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("定时同步已停止")
