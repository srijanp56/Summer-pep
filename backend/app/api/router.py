from fastapi import APIRouter
from app.api.endpoints import optimize, optimize_ws, weather, rag, security, export, missions

api_router = APIRouter()

api_router.include_router(optimize.router, tags=["Optimization"])
api_router.include_router(optimize_ws.router, tags=["Optimization WS"])
api_router.include_router(weather.router, tags=["Weather"])
api_router.include_router(rag.router, tags=["RAG Assistant"])
api_router.include_router(security.router, tags=["Cybersecurity"])
api_router.include_router(export.router, tags=["Export"])
api_router.include_router(missions.router, tags=["Mission History"])
