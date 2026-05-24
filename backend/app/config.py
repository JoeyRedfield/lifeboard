from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = ""
    ezbookkeeping_base_url: str = ""
    ezbookkeeping_token: str = ""
    sync_interval_minutes: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
