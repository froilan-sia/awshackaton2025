"""
Tests for Contextual Scoring Service
"""
import pytest
from datetime import datetime, time

from src.services.contextual_scoring import ContextualScoringService
from src.models.recommendation import (
    ContextualFactor, RecommendationItem, ContextType, 
    UserPreferences, BudgetRange, GroupType, ActivityLevel
)

@pytest.fixture
def contextual_service():
    return ContextualScoringService()

@pytest.fixture
def sample_items():
    """Create sample items with different characteristics"""
    return [
        RecommendationItem(
            id="outdoor_item",
            type="attraction",
            name="Victoria Peak",
            description="Mountain peak with outdoor hiking trails",
            location={
                "latitude": 22.2783,
                "longitude": 114.1747,
                "address": "Victoria Peak, Hong Kong",
                "district": "Central"
            },
            rating=4.5,
            categories=["outdoor", "hiking", "scenic"],
            estimated_duration=180,
            estimated_cost=65.0,
            weather_dependent=True,
            crowd_level="high",
            local_authenticity_score=0.6
        ),
        RecommendationItem(
            id="indoor_item",
            type="attraction",
            name="Hong Kong Museum",
            description="Indoor museum with air conditioning",
            location={
                "latitude": 22.3010,
                "longitude": 114.1722,
                "address": "Tsim Sha Tsui, Hong Kong",
                "district": "Tsim Sha Tsui"
            },
            rating=4.2,
            categories=["indoor", "cultural", "museum"],
            estimated_duration=120,
            estimated_cost=10.0,
            weather_dependent=False,
            crowd_level="moderate",
            local_authenticity_score=0.7
        ),
        RecommendationItem(
            id="restaurant_item",
            type="restaurant",
            name="Rooftop Restaurant",
            description="Outdoor dining with city views",
            location={
                "latitude": 22.2800,
                "longitude": 114.1600,
                "address": "Central, Hong Kong",
                "district": "Central"
            },
            rating=4.4,
            categories=["dining", "outdoor", "romantic"],
            estimated_duration=120,
            estimated_cost=300.0,
            weather_dependent=True,
            crowd_level="low",
            local_authenticity_score=0.5
        )
    ]

@pytest.fixture
def sample_preferences():
    return UserPreferences(
        interests=["outdoor", "scenic"],
        budget_range=BudgetRange.MEDIUM,
        group_type=GroupType.COUPLE,
        activity_level=ActivityLevel.MODERATE,
        weather_preferences=["outdoor_preferred"]
    )

@pytest.mark.asyncio
async def test_apply_contextual_scoring(contextual_service, sample_items, sample_preferences):
    """Test applying contextual factors to scores"""
    base_scores = [0.8, 0.6, 0.7]
    
    contextual_factors = [
        ContextualFactor(
            type=ContextType.WEATHER,
            value={"condition": "sunny", "temperature": 25, "humidity": 60},
            impact=0.8,
            confidence=0.9,
            description="Sunny weather"
        )
    ]
    
    adjusted_scores = await contextual_service.apply_contextual_scoring(
        sample_items, base_scores, contextual_factors, sample_preferences
    )
    
    assert len(adjusted_scores) == len(base_scores)
    assert all(isinstance(score, (int, float)) for score in adjusted_scores)
    
    # Outdoor items should be boosted in sunny weather
    assert adjusted_scores[0] >= base_scores[0]  # Outdoor item boosted

@pytest.mark.asyncio
async def test_apply_weather_context_sunny(contextual_service, sample_items, sample_preferences):
    """Test weather context application for sunny weather"""
    base_scores = [0.5, 0.5, 0.5]
    
    weather_factor = ContextualFactor(
        type=ContextType.WEATHER,
        value={"condition": "sunny", "temperature": 25, "humidity": 60},
        impact=0.8,
        confidence=1.0,
        description="Perfect sunny day"
    )
    
    adjusted_scores = await contextual_service._apply_weather_context(
        sample_items, base_scores, weather_factor, sample_preferences
    )
    
    # Outdoor items should be boosted
    assert adjusted_scores[0] > base_scores[0]  # Victoria Peak (outdoor)
    assert adjusted_scores[2] > base_scores[2]  # Rooftop Restaurant (outdoor)

@pytest.mark.asyncio
async def test_apply_weather_context_rainy(contextual_service, sample_items, sample_preferences):
    """Test weather context application for rainy weather"""
    base_scores = [0.5, 0.5, 0.5]
    
    weather_factor = ContextualFactor(
        type=ContextType.WEATHER,
        value={"condition": "rainy", "temperature": 20, "humidity": 90},
        impact=0.8,
        confidence=1.0,
        description="Heavy rain"
    )
    
    adjusted_scores = await contextual_service._apply_weather_context(
        sample_items, base_scores, weather_factor, sample_preferences
    )
    
    # Indoor items should be boosted, outdoor items penalized
    assert adjusted_scores[1] > base_scores[1]  # Museum (indoor)
    assert adjusted_scores[0] < base_scores[0]  # Victoria Peak (outdoor)

def test_classify_item_environment(contextual_service, sample_items):
    """Test item environment classification"""
    outdoor_item = sample_items[0]  # Victoria Peak
    indoor_item = sample_items[1]   # Museum
    
    assert contextual_service._classify_item_environment(outdoor_item) == "outdoor"
    assert contextual_service._classify_item_environment(indoor_item) == "indoor"

@pytest.mark.asyncio
async def test_apply_crowd_context(contextual_service, sample_items):
    """Test crowd context application"""
    base_scores = [0.5, 0.5, 0.5]
    
    crowd_factor = ContextualFactor(
        type=ContextType.CROWD,
        value={"overall_crowd_level": "high"},
        impact=0.7,
        confidence=0.8,
        description="High crowd levels citywide"
    )
    
    adjusted_scores = await contextual_service._apply_crowd_context(
        sample_items, base_scores, crowd_factor
    )
    
    # Low crowd items should be boosted
    assert adjusted_scores[2] > base_scores[2]  # Restaurant (low crowd)
    assert adjusted_scores[0] <= base_scores[0]  # Victoria Peak (high crowd)

@pytest.mark.asyncio
async def test_apply_time_context_morning(contextual_service, sample_items):
    """Test time context for morning"""
    base_scores = [0.5, 0.5, 0.5]
    
    time_factor = ContextualFactor(
        type=ContextType.TIME,
        value={"current_time": "09:00"},
        impact=0.6,
        confidence=1.0,
        description="Morning time"
    )
    
    adjusted_scores = await contextual_service._apply_time_context(
        sample_items, base_scores, time_factor
    )
    
    assert len(adjusted_scores) == len(base_scores)
    # Outdoor activities should be boosted in morning
    assert adjusted_scores[0] >= base_scores[0]

@pytest.mark.asyncio
async def test_apply_time_context_evening(contextual_service, sample_items):
    """Test time context for evening"""
    base_scores = [0.5, 0.5, 0.5]
    
    time_factor = ContextualFactor(
        type=ContextType.TIME,
        value={"current_time": "19:00"},
        impact=0.6,
        confidence=1.0,
        description="Evening time"
    )
    
    adjusted_scores = await contextual_service._apply_time_context(
        sample_items, base_scores, time_factor
    )
    
    # Dining should be boosted in evening
    assert adjusted_scores[2] >= base_scores[2]  # Restaurant

def test_get_time_period(contextual_service):
    """Test time period classification"""
    assert contextual_service._get_time_period(8) == "morning"
    assert contextual_service._get_time_period(14) == "afternoon"
    assert contextual_service._get_time_period(19) == "evening"
    assert contextual_service._get_time_period(23) == "night"

@pytest.mark.asyncio
async def test_apply_location_context_nearby(contextual_service, sample_items):
    """Test location context for nearby items"""
    base_scores = [0.5, 0.5, 0.5]
    
    # User location close to Victoria Peak
    location_factor = ContextualFactor(
        type=ContextType.LOCATION,
        value={"latitude": 22.2780, "longitude": 114.1750},
        impact=0.7,
        confidence=1.0,
        description="User location"
    )
    
    adjusted_scores = await contextual_service._apply_location_context(
        sample_items, base_scores, location_factor
    )
    
    # Victoria Peak should be boosted (closest)
    assert adjusted_scores[0] > base_scores[0]

@pytest.mark.asyncio
async def test_apply_location_context_far(contextual_service, sample_items):
    """Test location context for distant items"""
    base_scores = [0.5, 0.5, 0.5]
    
    # User location far from all items
    location_factor = ContextualFactor(
        type=ContextType.LOCATION,
        value={"latitude": 22.5000, "longitude": 114.5000},
        impact=0.7,
        confidence=1.0,
        description="User location far away"
    )
    
    adjusted_scores = await contextual_service._apply_location_context(
        sample_items, base_scores, location_factor
    )
    
    # All items should be penalized for distance
    assert all(score <= base_score for score, base_score in zip(adjusted_scores, base_scores))

def test_calculate_distance(contextual_service):
    """Test distance calculation"""
    # Distance between Central and TST (approximately 2km)
    distance = contextual_service._calculate_distance(
        22.2793, 114.1628,  # Central
        22.3010, 114.1722   # TST
    )
    
    assert isinstance(distance, float)
    assert 1 < distance < 5  # Should be a few kilometers

@pytest.mark.asyncio
async def test_apply_seasonal_context_summer(contextual_service, sample_items):
    """Test seasonal context for summer"""
    base_scores = [0.5, 0.5, 0.5]
    
    season_factor = ContextualFactor(
        type=ContextType.SEASON,
        value={"season": "summer"},
        impact=0.6,
        confidence=0.8,
        description="Summer season"
    )
    
    adjusted_scores = await contextual_service._apply_seasonal_context(
        sample_items, base_scores, season_factor
    )
    
    # Indoor activities should be boosted in summer
    assert adjusted_scores[1] >= base_scores[1]  # Museum (indoor)

@pytest.mark.asyncio
async def test_generate_contextual_explanations(contextual_service, sample_items):
    """Test generating contextual explanations"""
    item = sample_items[0]  # Victoria Peak
    
    contextual_factors = [
        ContextualFactor(
            type=ContextType.WEATHER,
            value={"condition": "sunny"},
            impact=0.8,
            confidence=1.0,
            description="Sunny weather"
        ),
        ContextualFactor(
            type=ContextType.CROWD,
            value={},
            impact=0.5,
            confidence=0.8,
            description="Crowd info"
        )
    ]
    
    explanations = await contextual_service.generate_contextual_explanations(
        item, contextual_factors, 0.2  # Positive score change
    )
    
    assert isinstance(explanations, list)
    assert len(explanations) > 0
    assert all(isinstance(exp, str) for exp in explanations)

def test_get_context_impact_summary(contextual_service):
    """Test getting context impact summary"""
    contextual_factors = [
        ContextualFactor(
            type=ContextType.WEATHER,
            value={"condition": "sunny"},
            impact=0.8,
            confidence=1.0,
            description="Sunny weather"
        ),
        ContextualFactor(
            type=ContextType.TIME,
            value={"current_time": "10:00"},
            impact=0.6,
            confidence=0.9,
            description="Morning time"
        )
    ]
    
    summary = contextual_service.get_context_impact_summary(contextual_factors)
    
    assert isinstance(summary, dict)
    assert "weather" in summary
    assert "time" in summary
    
    for factor_type, info in summary.items():
        assert "impact" in info
        assert "confidence" in info
        assert "description" in info

@pytest.mark.asyncio
async def test_multiple_contextual_factors(contextual_service, sample_items, sample_preferences):
    """Test applying multiple contextual factors simultaneously"""
    base_scores = [0.5, 0.5, 0.5]
    
    contextual_factors = [
        ContextualFactor(
            type=ContextType.WEATHER,
            value={"condition": "sunny", "temperature": 25},
            impact=0.8,
            confidence=1.0,
            description="Perfect weather"
        ),
        ContextualFactor(
            type=ContextType.TIME,
            value={"current_time": "10:00"},
            impact=0.6,
            confidence=0.9,
            description="Morning time"
        ),
        ContextualFactor(
            type=ContextType.LOCATION,
            value={"latitude": 22.2780, "longitude": 114.1750},
            impact=0.7,
            confidence=1.0,
            description="Near Victoria Peak"
        )
    ]
    
    adjusted_scores = await contextual_service.apply_contextual_scoring(
        sample_items, base_scores, contextual_factors, sample_preferences
    )
    
    # Victoria Peak should be significantly boosted (sunny weather + morning + nearby)
    assert adjusted_scores[0] > base_scores[0]
    
    # All scores should be valid
    assert all(0 <= score <= 2 for score in adjusted_scores)  # Allow for boosting above 1

@pytest.mark.asyncio
async def test_confidence_weighting(contextual_service, sample_items, sample_preferences):
    """Test that confidence affects the strength of contextual adjustments"""
    base_scores = [0.5, 0.5, 0.5]
    
    # High confidence factor
    high_confidence_factor = ContextualFactor(
        type=ContextType.WEATHER,
        value={"condition": "sunny"},
        impact=0.8,
        confidence=1.0,
        description="Certain sunny weather"
    )
    
    # Low confidence factor
    low_confidence_factor = ContextualFactor(
        type=ContextType.WEATHER,
        value={"condition": "sunny"},
        impact=0.8,
        confidence=0.3,
        description="Uncertain sunny weather"
    )
    
    high_conf_scores = await contextual_service.apply_contextual_scoring(
        sample_items, base_scores, [high_confidence_factor], sample_preferences
    )
    
    low_conf_scores = await contextual_service.apply_contextual_scoring(
        sample_items, base_scores, [low_confidence_factor], sample_preferences
    )
    
    # High confidence should have stronger impact
    high_conf_change = abs(high_conf_scores[0] - base_scores[0])
    low_conf_change = abs(low_conf_scores[0] - base_scores[0])
    
    assert high_conf_change > low_conf_change