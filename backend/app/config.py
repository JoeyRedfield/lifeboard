from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lifeboard:lifeboard@localhost:5432/lifeboard"
    ezbookkeeping_base_url: str = ""
    ezbookkeeping_token: str = ""
    sync_interval_minutes: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
