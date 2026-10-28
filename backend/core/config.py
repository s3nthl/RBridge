from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    api_port: int = 8000
    # Comma-separated. The first entry is used to build links in emails and responses.
    frontend_url: str = "http://localhost:3000"
    database_url: str = "sqlite+aiosqlite:///./rbridge_dev.db"
    rbridge_jwt_secret: str = "dev-secret-change-in-production"
    rbridge_jwt_algorithm: str = "HS256"
    rbridge_jwt_ttl_hours: int = 72
    resend_api_key: str = ""
    resend_from: str = "onboarding@resend.dev"
    resend_log: bool = False  # when True, log email instead of sending
    openrouter_api_key: str = ""
    disable_non_essential_model_calls: int = 1

    model_config = {"env_file": ".env.local", "extra": "ignore"}

    @property
    def allowed_origins(self) -> list[str]:
        """CORS origins from the comma-separated frontend_url."""
        return [o.strip() for o in self.frontend_url.split(",") if o.strip()]

    @property
    def public_frontend_url(self) -> str:
        return self.allowed_origins[0]


settings = Settings()
