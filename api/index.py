import sys
import os

# Add backend directory to Python path so app modules resolve correctly
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# Export app for Vercel Serverless Function handler
__all__ = ["app"]
