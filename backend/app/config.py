from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = ""
    ezbookkeeping_base_url: str = ""
    ezbookkeeping_token: str = ""
    reward_todo_base_url: str = ""
    reward_todo_readonly_token: str = ""
    reward_todo_app_url: str = ""
    sync_interval_minutes: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
