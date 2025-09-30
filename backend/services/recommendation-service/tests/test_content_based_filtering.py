"""
Tests for Content-Based Filtering Service
"""
import pytest
import numpy as np
from datetime import datetime

from src.services.content_based_filtering import ContentBasedFilteringService
from src.models.recommendation import (
    UserProfile, UserInteraction, UserPreferences, RecommendationItem,
    BudgetRange, GroupType, ActivityLevel
)

@pytest.fixture
def content_service():
    return ContentBasedFilteringService()

@pytest.fixture
def sample_items():
    """Create sample recommendation items with diverse features"""
    return [
        RecommendationItem(
            id="item_1",
            type="attraction",
            name="Victoria Peak Tram",
            description="Historic tram ride to mountain peak with panoramic city views and observation deck",
            location={
                "latitude": 22.2783,
                "longitude": 114.1747,
                "address": "Victoria Peak, Hong Kong",
                "district": "Central"
            },
            rating=4.5,
            categories=["outdoor", "scenic", "tourist", "mountain", "transport"],
            estimated_duration=180,
            estimated_cost=65.0,
            weather_dependent=True,
            crowd_level="high",
            local_authenticity_score=0.6
        ),
        RecommendationItem(
            id="item_2",
            type="restaurant",
            name="Tim Ho Wan Dim Sum",
            description="Michelin-starred dim sum restaurant serving traditional Cantonese breakfast",
            location={
                "latitude": 22.2793,
                "longitude": 114.1628,
                "address": "Central, Hong Kong",
                "district": "Central"
            },
            rating=4.3,
            categories=["dining", "dim sum", "local", "authentic", "cantonese"],
            estimated_duration=90,
            estimated_cost=150.0,
            weather_dependent=False,
            crowd_level="moderate",
            local_authenticity_score=0.9
        ),
        RecommendationItem(
            id="item_3",
            type="activity",
            name="Dragon's Back Hiking Trail",
            description="Scenic hiking trail with coastal views and natural landscapes",
            location={
                "latitude": 22.2400,
                "longitude": 114.2500,
                "address": "Shek O, Hong Kong",
                "district": "Southern"
            },
            rating=4.7,
            categories=["outdoor", "hiking", "nature", "scenic", "exercise"],
            estimated_duration=240,
            estimated_cost=0.0,
            weather_dependent=True,
            crowd_level="low",
            local_authenticity_score=0.8
        ),
        RecommendationItem(
            id="item_4",
            type="attraction",
            name="Hong Kong Museum of History",
            description="Cultural museum showcasing Hong Kong's rich history and heritage",
            location={
                "latitude": 22.3010,
                "longitude": 114.1722,
                "address": "Tsim Sha Tsui, Hong Kong",
                "district": "Tsim Sha Tsui"
            },
            rating=4.2,
            categories=["indoor", "cultural", "museum", "history", "educational"],
            estimated_duration=120,
            estimated_cost=10.0,
            weather_dependent=False,
            crowd_level="moderate",
            local_authenticity_score=0.7
        )
    ]

@pytest.fixture
def sample_user_profile():
    """Create sample user profile for testing"""
    return UserProfile(
        user_id="test_user",
        preferences=UserPreferences(
            interests=["outdoor", "scenic", "hiking"],
            budget_range=BudgetRange.MEDIUM,
            group_type=GroupType.SOLO,
            activity_level=ActivityLevel.HIGH
        ),
        interaction_history=[
            UserInteraction(
                user_id="test_user",
                item_id="item_1",
                interaction_type="rate",
                rating=5.0,
                timestamp=datetime.now()
            ),
            UserInteraction(
                user_id="test_user",
                item_id="item_3",
                interaction_type="visit",
                rating=4.5,
                timestamp=datetime.now()
            )
        ]
    )

@pytest.mark.asyncio
async def test_build_item_features(content_service, sample_items):
    """Test building item feature vectors"""
    features = await content_service.build_item_features(sample_items)
    
    assert isinstance(features, dict)
    assert len(features) == len(sample_items)
    
    # Check that each item has a feature vector
    for item in sample_items:
        assert item.id in features
        assert isinstance(features[item.id], np.ndarray)
        assert len(features[item.id]) > 0

def test_encode_crowd_level(content_service):
    """Test crowd level encoding"""
    assert content_service._encode_crowd_level("very_low") == 0.0
    assert content_service._encode_crowd_level("low") == 0.25
    assert content_service._encode_crowd_level("moderate") == 0.5
    assert content_service._encode_crowd_level("high") == 0.75
    assert content_service._encode_crowd_level("very_high") == 1.0
    assert content_service._encode_crowd_level("unknown") == 0.5  # Default

@pytest.mark.asyncio
async def test_build_user_profile_vector(content_service, sample_user_profile, sample_items):
    """Test building user profile vector"""
    await content_service.build_item_features(sample_items)
    user_vector = await content_service.build_user_profile_vector(sample_user_profile, sample_items)
    
    assert isinstance(user_vector, np.ndarray)
    assert len(user_vector) > 0
    assert not np.all(user_vector == 0)  # Should have some non-zero values

def test_encode_preferences(content_service, sample_user_profile):
    """Test encoding user preferences"""
    # Mock feature names for testing
    content_service.feature_names = ['outdoor', 'scenic', 'hiking', 'rating', 'duration', 'cost', 'weather', 'crowd', 'authenticity']
    content_service.tfidf_vectorizer.vocabulary_ = {'outdoor': 0, 'scenic': 1, 'hiking': 2}
    
    pref_vector = content_service._encode_preferences(sample_user_profile.preferences)
    
    assert isinstance(pref_vector, np.ndarray)
    assert len(pref_vector) == len(content_service.feature_names)

def test_get_interaction_weight(content_service):
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
    
    rate_weight = content_service._get_interaction_weight(rate_interaction)
    view_weight = content_service._get_interaction_weight(view_interaction)
    
    assert rate_weight > view_weight
    assert rate_weight > 0
    assert view_weight > 0

@pytest.mark.asyncio
async def test_generate_content_based_recommendations(content_service, sample_user_profile, sample_items):
    """Test generating content-based recommendations"""
    await content_service.build_item_features(sample_items)
    
    recommendations = await content_service.generate_content_based_recommendations(
        sample_user_profile, sample_items, top_k=3
    )
    
    assert isinstance(recommendations, list)
    assert len(recommendations) <= 3
    
    # Check recommendation format
    for item, score in recommendations:
        assert isinstance(item, RecommendationItem)
        assert isinstance(score, (int, float))
        assert score >= 0

def test_apply_preference_boosting(content_service, sample_items, sample_user_profile):
    """Test preference-based score boosting"""
    item = sample_items[0]  # Victoria Peak (outdoor, scenic)
    base_score = 0.5
    
    boosted_score = content_service._apply_preference_boosting(
        item, sample_user_profile.preferences, base_score
    )
    
    # Should boost score for matching interests
    assert boosted_score >= base_score

@pytest.mark.asyncio
async def test_get_item_similarities(content_service, sample_items):
    """Test finding similar items"""
    await content_service.build_item_features(sample_items)
    
    similarities = await content_service.get_item_similarities("item_1", top_k=2)
    
    assert isinstance(similarities, list)
    assert len(similarities) <= 2
    
    # Check similarity format
    for item_id, similarity in similarities:
        assert isinstance(item_id, str)
        assert isinstance(similarity, (int, float))
        assert 0 <= similarity <= 1

def test_get_feature_importance(content_service, sample_user_profile, sample_items):
    """Test getting feature importance"""
    # Mock some data
    content_service.feature_names = ['outdoor', 'scenic', 'rating', 'cost']
    
    importance = content_service.get_feature_importance(sample_user_profile, sample_items)
    
    assert isinstance(importance, dict)
    # Should return empty dict or valid importance scores
    if importance:
        for feature, score in importance.items():
            assert isinstance(feature, str)
            assert isinstance(score, (int, float))
            assert score >= 0

@pytest.mark.asyncio
async def test_empty_items_list(content_service):
    """Test handling empty items list"""
    features = await content_service.build_item_features([])
    assert features == {}

@pytest.mark.asyncio
async def test_user_with_no_interactions(content_service, sample_items):
    """Test recommendations for user with no interactions"""
    empty_profile = UserProfile(
        user_id="empty_user",
        preferences=UserPreferences(
            interests=["outdoor"],
            budget_range=BudgetRange.MEDIUM,
            group_type=GroupType.SOLO,
            activity_level=ActivityLevel.MODERATE
        ),
        interaction_history=[]
    )
    
    await content_service.build_item_features(sample_items)
    recommendations = await content_service.generate_content_based_recommendations(
        empty_profile, sample_items, top_k=3
    )
    
    assert isinstance(recommendations, list)
    # Should still generate recommendations based on preferences

@pytest.mark.asyncio
async def test_budget_compatibility_boosting(content_service, sample_items):
    """Test budget compatibility in preference boosting"""
    # Test low budget preference with expensive item
    low_budget_prefs = UserPreferences(
        interests=["dining"],
        budget_range=BudgetRange.LOW,
        group_type=GroupType.SOLO,
        activity_level=ActivityLevel.MODERATE
    )
    
    expensive_item = sample_items[1]  # Tim Ho Wan (150 HKD)
    base_score = 0.5
    
    boosted_score = content_service._apply_preference_boosting(
        expensive_item, low_budget_prefs, base_score
    )
    
    # Should reduce score for expensive item with low budget
    assert boosted_score <= base_score

@pytest.mark.asyncio
async def test_activity_level_matching(content_service, sample_items):
    """Test activity level matching in preference boosting"""
    high_activity_prefs = UserPreferences(
        interests=["hiking"],
        budget_range=BudgetRange.MEDIUM,
        group_type=GroupType.SOLO,
        activity_level=ActivityLevel.HIGH
    )
    
    hiking_item = sample_items[2]  # Dragon's Back (240 minutes)
    base_score = 0.5
    
    boosted_score = content_service._apply_preference_boosting(
        hiking_item, high_activity_prefs, base_score
    )
    
    # Should boost score for long-duration activity with high activity level
    assert boosted_score >= base_score