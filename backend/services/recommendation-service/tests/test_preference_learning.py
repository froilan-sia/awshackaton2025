"""
Tests for Preference Learning Service
"""
import pytest
from datetime import datetime, timedelta

from src.services.preference_learning import PreferenceLearningService
from src.models.recommendation import (
    UserProfile, UserInteraction, UserPreferences, RecommendationItem,
    BudgetRange, GroupType, ActivityLevel
)

@pytest.fixture
def preference_service():
    return PreferenceLearningService()

@pytest.fixture
def sample_items():
    """Create sample items for testing"""
    return [
        RecommendationItem(
            id="expensive_restaurant",
            type="restaurant",
            name="Luxury Restaurant",
            description="High-end dining experience",
            location={
                "latitude": 22.2793,
                "longitude": 114.1628,
                "address": "Central, Hong Kong",
                "district": "Central"
            },
            rating=4.8,
            categories=["dining", "luxury", "fine-dining"],
            estimated_duration=120,
            estimated_cost=800.0,
            weather_dependent=False,
            crowd_level="low",
            local_authenticity_score=0.6
        ),
        RecommendationItem(
            id="budget_food",
            type="restaurant",
            name="Street Food Stall",
            description="Authentic local street food",
            location={
                "latitude": 22.2800,
                "longitude": 114.1700,
                "address": "Mong Kok, Hong Kong",
                "district": "Mong Kok"
            },
            rating=4.2,
            categories=["dining", "street-food", "local", "authentic"],
            estimated_duration=30,
            estimated_cost=50.0,
            weather_dependent=False,
            crowd_level="high",
            local_authenticity_score=0.9
        ),
        RecommendationItem(
            id="long_hike",
            type="activity",
            name="MacLehose Trail",
            description="Long hiking trail across Hong Kong",
            location={
                "latitude": 22.3500,
                "longitude": 114.2000,
                "address": "New Territories, Hong Kong",
                "district": "New Territories"
            },
            rating=4.6,
            categories=["outdoor", "hiking", "nature", "challenging"],
            estimated_duration=480,  # 8 hours
            estimated_cost=0.0,
            weather_dependent=True,
            crowd_level="very_low",
            local_authenticity_score=0.8
        )
    ]

@pytest.fixture
def sample_interactions():
    """Create sample user interactions"""
    return [
        UserInteraction(
            user_id="test_user",
            item_id="expensive_restaurant",
            interaction_type="rate",
            rating=2.0,  # Didn't like expensive place
            timestamp=datetime.now() - timedelta(days=1)
        ),
        UserInteraction(
            user_id="test_user",
            item_id="budget_food",
            interaction_type="rate",
            rating=5.0,  # Loved budget food
            timestamp=datetime.now() - timedelta(hours=12)
        ),
        UserInteraction(
            user_id="test_user",
            item_id="long_hike",
            interaction_type="visit",
            rating=4.0,  # Enjoyed long hike
            timestamp=datetime.now() - timedelta(hours=6),
            context={"weather": "sunny", "time_of_day": "morning"}
        )
    ]

@pytest.mark.asyncio
async def test_learn_from_interactions(preference_service, sample_interactions, sample_items):
    """Test learning preferences from user interactions"""
    learned_prefs = await preference_service.learn_from_interactions(
        "test_user", sample_interactions, sample_items
    )
    
    assert isinstance(learned_prefs, dict)
    assert len(learned_prefs) > 0
    
    # Should learn budget preferences
    assert "budget_low" in learned_prefs
    assert learned_prefs["budget_low"] > 0  # Positive from good budget food rating
    
    # Should learn category preferences
    assert "category_dining" in learned_prefs
    assert "category_outdoor" in learned_prefs

def test_get_interaction_weight(preference_service):
    """Test interaction weight calculation"""
    rate_interaction = UserInteraction(
        user_id="test",
        item_id="test",
        interaction_type="rate",
        rating=4.0,
        timestamp=datetime.now()
    )
    
    view_interaction = UserInteraction(
        user_id="test",
        item_id="test",
        interaction_type="view",
        timestamp=datetime.now()
    )
    
    rate_weight = preference_service._get_interaction_weight(rate_interaction)
    view_weight = preference_service._get_interaction_weight(view_interaction)
    
    assert rate_weight > view_weight
    assert rate_weight > 0
    assert view_weight > 0

def test_learn_from_item_attributes(preference_service, sample_items):
    """Test learning from item attributes"""
    learned_prefs = {}
    expensive_item = sample_items[0]  # Luxury restaurant
    
    preference_service._learn_from_item_attributes(learned_prefs, expensive_item, 1.0)
    
    # Should learn luxury budget preference
    assert "budget_luxury" in learned_prefs
    assert learned_prefs["budget_luxury"] > 0
    
    # Should learn duration preference
    assert "duration_medium" in learned_prefs
    
    # Should learn quality preference
    assert "quality_high" in learned_prefs

def test_learn_from_context(preference_service):
    """Test learning from contextual information"""
    learned_prefs = {}
    context = {
        "weather": "sunny",
        "time_of_day": "morning",
        "district": "central"
    }
    
    preference_service._learn_from_context(learned_prefs, context, 1.0)
    
    assert "weather_sunny" in learned_prefs
    assert "time_morning" in learned_prefs
    assert "district_central" in learned_prefs
    assert all(value > 0 for value in learned_prefs.values())

@pytest.mark.asyncio
async def test_update_preferences_from_feedback(preference_service, sample_items):
    """Test updating preferences from explicit feedback"""
    item = sample_items[0]  # Expensive restaurant
    
    await preference_service.update_preferences_from_feedback(
        "test_user", "rec_123", 1.0, "Too expensive and not authentic", item
    )
    
    learned_prefs = await preference_service.get_learned_preferences("test_user")
    
    # Should have negative preferences for expensive categories
    assert "category_luxury" in learned_prefs
    assert learned_prefs["category_luxury"] < 0  # Negative feedback

def test_update_attribute_preferences(preference_service, sample_items):
    """Test updating attribute preferences from feedback"""
    learned_prefs = {}
    expensive_item = sample_items[0]
    
    # Negative feedback
    preference_service._update_attribute_preferences(learned_prefs, expensive_item, -0.5)
    
    assert "budget_luxury" in learned_prefs
    assert learned_prefs["budget_luxury"] < 0  # Should be negative

@pytest.mark.asyncio
async def test_process_text_feedback_positive(preference_service):
    """Test processing positive text feedback"""
    learned_prefs = {}
    feedback = "Amazing authentic local experience, very affordable and quick service"
    
    await preference_service._process_text_feedback(learned_prefs, feedback, 1.0)
    
    # Should extract positive signals
    assert "authenticity_high" in learned_prefs
    assert learned_prefs["authenticity_high"] > 0
    assert "budget_low" in learned_prefs
    assert learned_prefs["budget_low"] > 0

@pytest.mark.asyncio
async def test_process_text_feedback_negative(preference_service):
    """Test processing negative text feedback"""
    learned_prefs = {}
    feedback = "Too crowded, expensive, and felt very touristy"
    
    await preference_service._process_text_feedback(learned_prefs, feedback, -1.0)
    
    # Should extract negative signals
    assert "crowd_high" in learned_prefs
    assert learned_prefs["crowd_high"] < 0
    assert "budget_high" in learned_prefs
    assert learned_prefs["budget_high"] < 0

@pytest.mark.asyncio
async def test_get_learned_preferences(preference_service):
    """Test getting learned preferences"""
    # Add some mock preferences
    preference_service.user_learned_preferences["test_user"] = {
        "category_outdoor": 0.8,
        "budget_low": 0.6,
        "crowd_low": 0.4
    }
    
    prefs = await preference_service.get_learned_preferences("test_user")
    
    assert isinstance(prefs, dict)
    assert "category_outdoor" in prefs
    assert "budget_low" in prefs
    assert "crowd_low" in prefs

@pytest.mark.asyncio
async def test_get_learned_preferences_empty_user(preference_service):
    """Test getting preferences for user with no data"""
    prefs = await preference_service.get_learned_preferences("nonexistent_user")
    
    assert prefs == {}

@pytest.mark.asyncio
async def test_merge_explicit_and_learned_preferences(preference_service):
    """Test merging explicit and learned preferences"""
    explicit_prefs = UserPreferences(
        interests=["outdoor", "hiking"],
        budget_range=BudgetRange.LOW,
        group_type=GroupType.SOLO,
        activity_level=ActivityLevel.HIGH
    )
    
    learned_prefs = {
        "category_outdoor": 0.5,
        "budget_medium": 0.3,
        "duration_long": 0.7
    }
    
    merged = await preference_service.merge_explicit_and_learned_preferences(
        explicit_prefs, learned_prefs
    )
    
    assert isinstance(merged, dict)
    
    # Explicit preferences should have higher weight
    assert "category_outdoor" in merged
    assert merged["category_outdoor"] > learned_prefs["category_outdoor"]
    
    # Should include explicit budget preference
    assert "budget_low" in merged

@pytest.mark.asyncio
async def test_predict_user_rating(preference_service, sample_items):
    """Test predicting user rating for an item"""
    # Set up some learned preferences
    preference_service.user_learned_preferences["test_user"] = {
        "category_outdoor": 0.8,
        "budget_low": 0.6,
        "duration_long": 0.4
    }
    
    explicit_prefs = UserPreferences(
        interests=["outdoor"],
        budget_range=BudgetRange.LOW,
        activity_level=ActivityLevel.HIGH
    )
    
    hiking_item = sample_items[2]  # Long hike
    
    predicted_rating = await preference_service.predict_user_rating(
        "test_user", hiking_item, explicit_prefs
    )
    
    assert isinstance(predicted_rating, float)
    assert 1.0 <= predicted_rating <= 5.0
    
    # Should predict high rating for matching preferences
    assert predicted_rating > 3.0

@pytest.mark.asyncio
async def test_predict_user_rating_no_preferences(preference_service, sample_items):
    """Test predicting rating with no learned preferences"""
    explicit_prefs = UserPreferences()
    item = sample_items[0]
    
    predicted_rating = await preference_service.predict_user_rating(
        "new_user", item, explicit_prefs
    )
    
    # Should return neutral rating
    assert predicted_rating == 3.0

def test_get_preference_insights(preference_service):
    """Test getting preference insights"""
    # Set up mock preferences
    preference_service.user_learned_preferences["test_user"] = {
        "category_outdoor": 0.8,
        "category_dining": 0.6,
        "budget_low": 0.7,
        "budget_high": -0.3,
        "crowd_low": 0.5,
        "weather_sunny": 0.4
    }
    
    insights = preference_service.get_preference_insights("test_user")
    
    assert isinstance(insights, dict)
    assert "top_preferences" in insights
    assert "categorized_preferences" in insights
    assert "total_preferences" in insights
    assert "learning_strength" in insights
    
    # Check categorized preferences
    categories = insights["categorized_preferences"]
    assert "interests" in categories
    assert "budget" in categories
    assert "crowd" in categories

def test_get_preference_insights_empty_user(preference_service):
    """Test getting insights for user with no preferences"""
    insights = preference_service.get_preference_insights("nonexistent_user")
    
    assert insights == {}

@pytest.mark.asyncio
async def test_temporal_decay(preference_service, sample_interactions):
    """Test temporal decay of preferences"""
    # Set up initial preferences
    preference_service.user_learned_preferences["test_user"] = {
        "category_outdoor": 1.0,
        "budget_low": 0.8
    }
    
    await preference_service._apply_temporal_decay("test_user", sample_interactions)
    
    prefs = preference_service.user_learned_preferences["test_user"]
    
    # Preferences should be decayed
    assert prefs["category_outdoor"] < 1.0
    assert prefs["budget_low"] < 0.8

@pytest.mark.asyncio
async def test_learning_rate_effect(preference_service, sample_items):
    """Test that learning rate affects preference updates"""
    # Test with different learning rates
    service_high_lr = PreferenceLearningService(learning_rate=0.5)
    service_low_lr = PreferenceLearningService(learning_rate=0.1)
    
    interaction = UserInteraction(
        user_id="test",
        item_id="budget_food",
        interaction_type="rate",
        rating=5.0,
        timestamp=datetime.now()
    )
    
    # Learn with high learning rate
    prefs_high = await service_high_lr.learn_from_interactions(
        "test", [interaction], sample_items
    )
    
    # Learn with low learning rate
    prefs_low = await service_low_lr.learn_from_interactions(
        "test", [interaction], sample_items
    )
    
    # High learning rate should result in stronger preferences
    for key in prefs_high:
        if key in prefs_low:
            assert abs(prefs_high[key]) >= abs(prefs_low[key])

@pytest.mark.asyncio
async def test_preference_normalization(preference_service):
    """Test that preferences are normalized properly"""
    # Set up extreme preferences
    preference_service.user_learned_preferences["test_user"] = {
        "category_outdoor": 10.0,  # Very high
        "budget_low": -5.0,        # Very negative
        "crowd_low": 0.1           # Small positive
    }
    
    normalized_prefs = await preference_service.get_learned_preferences("test_user")
    
    # Should be normalized
    assert all(abs(value) <= 1.0 for value in normalized_prefs.values())
    
    # Relative ordering should be preserved
    assert normalized_prefs["category_outdoor"] > normalized_prefs["crowd_low"]
    assert normalized_prefs["budget_low"] < 0