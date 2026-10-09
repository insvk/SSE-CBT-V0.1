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
        default="https://placeholder.supabase.co",
        alias="SUPABASE_URL",
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="placeholder",
        alias="SUPABASE_SERVICE_ROLE_KEY",
    )
    SUPABASE_JWT_SECRET: str = Field(
        default="",
        alias="SUPABASE_JWT_SECRET",
    )

    # Environment flag
    ENV: str = Field(default="development", alias="ENV")


settings = Settings()
