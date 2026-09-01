import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    # App Info
    APP_NAME: str = "CashIQ"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Razorpay Sandbox Credentials
    RAZORPAY_KEY_ID: str = "rzp_test_mock_key_id"
    RAZORPAY_KEY_SECRET: str = "mock_secret_for_dev_mode"
    RAZORPAY_WEBHOOK_SECRET: str = "cashiq_webhook_secret_2026"

    # LLM Settings (Gemini Flash)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Operational Guardrail Thresholds
    EXTRACTION_CONFIDENCE_GATE: float = 0.80
    HIGH_VALUE_THRESHOLD_INR: float = 250000.0  # ₹2.5 Lakhs
    PROACTIVE_COOLDOWN_DAYS: int = 4
    HIGH_CREDIBILITY_PROB_THRESHOLD: float = 0.70
    LOW_CREDIBILITY_PROB_THRESHOLD: float = 0.50


settings = Settings()
