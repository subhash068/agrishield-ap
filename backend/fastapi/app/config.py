from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_dsn: str = "postgresql+psycopg://postgres:manager@localhost:5432/agrishield"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    weather_latitude: float = 15.9129
    weather_longitude: float = 79.7400
    weather_timezone: str = "Asia/Kolkata"

    class Config:
        env_file = ".env"


settings = Settings()

