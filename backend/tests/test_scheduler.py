from types import SimpleNamespace

from app import scheduler as scheduler_module


class FakeScheduler:
    def __init__(self):
        self.running = False
        self.jobs = []
        self.shutdown_called = False

    def scheduled_job(self, *args, **kwargs):
        def decorator(func):
            self.jobs.append((args, kwargs, func))
            return func

        return decorator

    def start(self):
        self.running = True

    def shutdown(self, wait=True):
        self.shutdown_called = True
        self.shutdown_wait = wait
        self.running = False


def test_start_scheduler_skips_when_ezbookkeeping_is_not_configured(monkeypatch):
    fake_scheduler = FakeScheduler()
    monkeypatch.setattr(scheduler_module, "scheduler", fake_scheduler)
    monkeypatch.setattr(
        scheduler_module,
        "settings",
        SimpleNamespace(
            ezbookkeeping_base_url="",
            ezbookkeeping_token="",
            sync_interval_minutes=60,
        ),
    )

    scheduler_module.start_scheduler()

    assert fake_scheduler.jobs == []
    assert fake_scheduler.running is False


def test_start_scheduler_is_idempotent_when_already_running(monkeypatch):
    fake_scheduler = FakeScheduler()
    fake_scheduler.running = True
    monkeypatch.setattr(scheduler_module, "scheduler", fake_scheduler)
    monkeypatch.setattr(
        scheduler_module,
        "settings",
        SimpleNamespace(
            ezbookkeeping_base_url="http://ezbookkeeping",
            ezbookkeeping_token="token",
            sync_interval_minutes=60,
        ),
    )

    scheduler_module.start_scheduler()

    assert fake_scheduler.jobs == []
    assert fake_scheduler.running is True


def test_stop_scheduler_shuts_down_running_scheduler(monkeypatch):
    fake_scheduler = FakeScheduler()
    fake_scheduler.running = True
    monkeypatch.setattr(scheduler_module, "scheduler", fake_scheduler)

    scheduler_module.stop_scheduler()

    assert fake_scheduler.shutdown_called is True
    assert fake_scheduler.shutdown_wait is False
    assert fake_scheduler.running is False
