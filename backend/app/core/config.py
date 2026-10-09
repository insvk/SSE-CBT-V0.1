from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SIMATS CBT Platform API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    SUPABASE_URL: str = Field(default="https://placeholder.supabase.co", env="SUPABASE_URL")
    SUPABASE_KEY: str = Field(default="placeholder", env="SUPABASE_KEY")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
