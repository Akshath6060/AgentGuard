from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: str = "development"
    log_level: str = "INFO"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "agentguard"
    mongodb_server_selection_timeout_ms: int = Field(default=5000, ge=1000, le=30000)
    jwt_secret: str = Field("development-only-change-me-32-chars", min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    jwt_issuer: str = "agentguard"
    jwt_audience: str = "agentguard-console"
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    payment_mode: str = "mock"
    ai_policy_provider: str = "mock"

    @field_validator("app_env", "payment_mode", "ai_policy_provider", mode="before")
    @classmethod
    def normalize_mode(cls, value):
        return str(value).strip().lower()

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        configured = [item.strip().rstrip("/") for item in self.allowed_origins.split(",") if item.strip()]
        origins = set(configured or [self.frontend_url.rstrip("/")])
        if not self.is_production:
            for origin in list(origins):
                if origin.startswith("http://localhost:"):
                    origins.add(origin.replace("http://localhost:", "http://127.0.0.1:"))
                elif origin.startswith("http://127.0.0.1:"):
                    origins.add(origin.replace("http://127.0.0.1:", "http://localhost:"))
        return sorted(origins)

    def validate_runtime(self) -> None:
        if self.app_env not in {"development", "test", "production"}:
            raise RuntimeError("APP_ENV must be development, test, or production")
        if self.payment_mode not in {"mock", "razorpay"}:
            raise RuntimeError("PAYMENT_MODE must be mock or razorpay")
        if self.is_production:
            if self.jwt_secret.startswith(("development-", "replace-")):
                raise RuntimeError("JWT_SECRET must be replaced in production")
            if any(origin == "*" or not origin.startswith("https://") for origin in self.cors_origins):
                raise RuntimeError("Production ALLOWED_ORIGINS must contain explicit HTTPS origins")
            if self.payment_mode == "razorpay" and not all((self.razorpay_key_id, self.razorpay_key_secret, self.razorpay_webhook_secret)):
                raise RuntimeError("Razorpay credentials and webhook secret are required in production")

    def payment_ready_for(self, environment: str) -> bool:
        expected_prefix = "rzp_live_" if environment == "live" else "rzp_test_"
        return self.payment_mode == "razorpay" and bool(self.razorpay_key_secret) and self.razorpay_key_id.startswith(expected_prefix)


@lru_cache
def get_settings() -> Settings:
    return Settings()
