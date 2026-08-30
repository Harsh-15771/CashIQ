from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .api import routes_inbound, routes_invoices, routes_actions, routes_razorpay, routes_level5
from .ml.predictor import get_ptp_predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Pre-load and verify LightGBM PTP Predictor
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}...")
    try:
        predictor = get_ptp_predictor()
        print("ML Promise-Fulfillment Predictor loaded successfully.")
    except Exception as e:
        print(f"Warning: ML model initialization error: {e}")
    yield
    print("Shutting down CashIQ Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Autonomous B2B Receivables Intelligence & Guardrailed Recovery Engine on Razorpay Invoices",
    lifespan=lifespan,
)

# Enable CORS for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(routes_inbound.router)
app.include_router(routes_invoices.router)
app.include_router(routes_actions.router)
app.include_router(routes_razorpay.router)
app.include_router(routes_level5.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "service": "cashiq-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
