from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "agentguard"
    jwt_secret: str = Field("development-only-change-me-32-chars", min_length=16)
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    frontend_url: str = "http://localhost:5173"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    payment_mode: str = "mock"
    ai_policy_provider: str = "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()

