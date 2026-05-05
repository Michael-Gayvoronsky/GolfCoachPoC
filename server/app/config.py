from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    jwt_secret: str = "dev-secret-change-in-prod"
    jwt_expire_days: int = 30

    port: int = 8000


settings = Settings()
