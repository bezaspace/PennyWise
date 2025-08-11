from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from database import create_tables, seed_database, engine
from adk_services import initialize_adk_services
from ai import router as ai_router

# Import all routers
from routers import (
    health, transactions, budgets, goals, 
    categories, analytics, investments
)

load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="PennyWise Finance API", version="1.0.0")

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:8081").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(health.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(categories.router)
app.include_router(analytics.router)
app.include_router(investments.router)
app.include_router(ai_router)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    create_tables()
    initialize_adk_services(engine)
    seed_database()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
