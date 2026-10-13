from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        populate_by_name=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "SIMATS CBT Platform API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Supabase configuration
    SUPABASE_URL: str = Field(
        default="https://xqiycolwfclfgamkiibt.supabase.co",
        alias="SUPABASE_URL",
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaXljb2x3ZmNsZmdhbWtpaWJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTUyODQ1OSwiZXhwIjoyMTA3MTA0NDU5fQ.AF9W9IUnBKVFwnEYAKjbW5Tc5Wy-batUj5am1Jx6FII",
        alias="SUPABASE_SERVICE_ROLE_KEY",
    )
    SUPABASE_JWT_SECRET: str = Field(
        default="rzU3+YDu9rWQwG5ynQ4pdHg/hgB6IB0Rdq9vnfE/7xjCpK2kEIIxCQy4v+3OM1+U3NZsWvr4FiFKo+uliSN6VQ==",
        alias="SUPABASE_JWT_SECRET",
    )

    # Environment flag
    ENV: str = Field(default="development", alias="ENV")


settings = Settings()
