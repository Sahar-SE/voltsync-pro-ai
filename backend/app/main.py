from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.core.database import init_db, save_telemetry
from app.services.eia_service import fetch_grid_data
from app.api.health import router as health_router
from app.api.telemetry import router as telemetry_router
from app.api.grid import router as grid_router
from app.core.config import EIA_REGION
from app.services.rag import initialize_rag
from app.api.rag import router as rag_router
from app.api.agent import router as agent_router

async def eia_poll_loop(app: FastAPI):
    while True:
        try:
            active_reg = getattr(app.state, "active_region", EIA_REGION)
            print(f"EIA Ingestion: Fetching grid data for {active_reg.upper()}...")
            data = fetch_grid_data(active_reg)
            # Only save to database if state represents an anomaly to keep Neon database size minimal
            stability = data.get("stability", 100.0)
            frequency = data.get("frequency", 50.0)
            voltage = data.get("voltage", 220.0)
            
            is_abnormal = (stability < 60.0 or frequency < 49.5 or frequency > 50.5 or voltage < 215.0)
            
            if is_abnormal:
                save_telemetry(
                    total_supply=data["total_supply"],
                    total_demand=data["total_demand"],
                    frequency=data["frequency"],
                    voltage=data["voltage"],
                    stability=data["stability"],
                    alerts=data["alerts"]
                )
                print("EIA Ingestion: Abnormal telemetry cached in database.")
            else:
                print("EIA Ingestion: Grid state is normal. Skipped database storage to save space.")
        except Exception as e:
            print(f"EIA Ingestion Failure: {e}")
        # Wait 15 minutes between polling
        await asyncio.sleep(900)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    init_db()
    
    # Initialize RAG vectors from manuals
    initialize_rag()
    
    # Initialize active region state
    app.state.active_region = EIA_REGION
    
    # Start EIA Background Worker
    app.state.eia_task = asyncio.create_task(eia_poll_loop(app))
    
    yield
    
    # Clean up background worker
    app.state.eia_task.cancel()


app = FastAPI(
    title="VoltSync Pro AI Backend",
    description="Real-time telemetry and Agentic SCADA API backend.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router, prefix="/api", tags=["Diagnostics"])
app.include_router(grid_router, prefix="/api", tags=["Grid"])
app.include_router(rag_router, prefix="/api", tags=["RAG"])
app.include_router(agent_router, prefix="/api", tags=["Agent"])
app.include_router(telemetry_router, prefix="/ws", tags=["Telemetry"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
