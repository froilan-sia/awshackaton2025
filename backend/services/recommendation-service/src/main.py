"""
Main FastAPI application for the AI Recommendation Service
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn
import os

from .models.recommendation import RecommendationRequest, RecommendationResponse
from .services.recommendation_engine import RecommendationEngine
from .services.collaborative_filtering import CollaborativeFilteringService
from .services.content_based_filtering import ContentBasedFilteringService
from .services.contextual_scoring import ContextualScoringService
from .services.preference_learning import PreferenceLearningService

app = FastAPI(
    title="AI Recommendation Service",
    description="AI-powered personalized tourism recommendations for Hong Kong",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
recommendation_engine = RecommendationEngine()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "recommendation-service"}

@app.post("/recommendations", response_model=List[RecommendationResponse])
async def get_recommendations(request: RecommendationRequest):
    """
    Generate personalized recommendations for a user
    """
    try:
        recommendations = await recommendation_engine.generate_recommendations(request)
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommendations/feedback")
async def submit_feedback(user_id: str, recommendation_id: str, rating: float, feedback: Optional[str] = None):
    """
    Submit feedback for a recommendation to improve future suggestions
    """
    try:
        await recommendation_engine.process_feedback(user_id, recommendation_id, rating, feedback)
        return {"status": "success", "message": "Feedback processed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommendations/user/{user_id}")
async def get_user_recommendations(user_id: str, limit: int = 10):
    """
    Get recent recommendations for a specific user
    """
    try:
        recommendations = await recommendation_engine.get_user_recommendations(user_id, limit)
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommendations/update-preferences")
async def update_user_preferences(user_id: str, preferences: dict):
    """
    Update user preferences and retrain personalization model
    """
    try:
        await recommendation_engine.update_user_preferences(user_id, preferences)
        return {"status": "success", "message": "Preferences updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)