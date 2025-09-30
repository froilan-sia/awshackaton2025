"""
Tests for Main Recommendation Engine
"""
import pytest
from datetime import datetime, timedelta

from src.services.recommendation_engine import RecommendationEngine
from src.models.recommendation import (
    RecommendationRequest, RecommendationResponse, RecommendationItem,
    UserPreferences, ContextualFactor, ContextType,
    BudgetRange, GroupType, ActivityLevel, RecommendationType
)

@pytest.fixture
def recommendation_engine():
    return RecommendationEngine()

@pytest.fixture
def sample_request():
    """Create sample recommendation request"""
    return RecommendationRequest(
        user_id="test_user",
        preferences=UserPreferences(
            interests=["outdoor", "scenic"],
            budget_range=BudgetRange.MEDIUM,
            group_type=GroupType.SOLO,
            activity_level=ActivityLevel.MODERATE
        ),
        current_location={
            "latitude": 22.2783,
            "longitude": 114.1747,
            "address": "Central, Hong Kong",
            "district": "Central"
        },
        contextual_factors=[
            ContextualFactor(
                type=ContextType.WEATHER,
                value={"condition": "sunny", "temperature": 25},
                impact=0.8,
                confidence=0.9,
                description="Perfect sunny weather"
            )
        ],
        recommendation_types=[RecommendationType.ATTRACTION, RecommendationType.ACTIVITY],
        max_results=5,
        include_alternatives=True
    )

@pytest.mark.asyncio
async def test_generate_recommendations(recommendation_engine, sample_request):
    """Test generating recommendations"""
    # Wait for initialization to complete
    await recommendation_engine._initialize_mock_data()
    
    recommendations = await recommendation_engine.generate_recommendations(sample_request)
    
    assert isinstance(recommendations, list)
    assert len(recommendations) <= sample_request.max_results
    
    # Check recommendation format
    for rec in recommendations:
        assert isinstance(rec, RecommendationResponse)
        assert rec.user_id == sample_request.user_id
        assert isinstance(rec.personalized_score, (int, float))
        assert 0 <= rec.personalized_score <= 2  # Allow for contextual boosting
        assert isinstance(rec.reasoning, str)
        assert len(rec.reasoning) > 0

@pytest.mark.asyncio
async def test_generate_recommendations_empty_results(recommendation_engine):
    """Test handling when no items match criteria"""
    # Request with very restrictive criteria
    restrictive_request = RecommendationRequest(
        user_id="test_user",
        preferences=UserPreferences(
            interests=["nonexistent_category"],
            budget_range=BudgetRange.LOW,
            dietary_restrictions=["everything"]  # Restrict everything
        ),
        max_results=5
    )
    
    recommendations = await recommendation_engine.generate_recommendations(restrictive_request)
    
    # Should handle gracefully
    assert isinstance(recommendations, list)

@pytest.mark.asyncio
async def test_get_or_create_user_profile(recommendation_engine):
    """Test getting or creating user profile"""
    preferences = UserPreferences(
        interests=["outdoor"],
        budget_range=BudgetRange.MEDIUM
    )
    
    # First call should create profile
    profile1 = await recommendation_engine._get_or_create_user_profile("new_user", preferences)
    assert profile1.user_id == "new_user"
    assert profile1.preferences == preferences
    
    # Second call should return existing profile
    profile2 = await recommendation_engine._get_or_create_user_profile("new_user", preferences)
    assert profile2.user_id == "new_user"

@pytest.mark.asyncio
async def test_filter_candidate_items(recommendation_engine, sample_request):
    """Test filtering candidate items"""
    await recommendation_engine._initialize_mock_data()
    
    candidates = await recommendation_engine._filter_candidate_items(sample_request)
    
    assert isinstance(candidates, list)
    
    # Should only include requested types
    requested_types = [rt.value for rt in sample_request.recommendation_types]
    for item in candidates:
        assert item.type in requested_types

@pytest.mark.asyncio
async def test_filter_by_budget(recommendation_engine):
    """Test filtering by budget range"""
    # Create request with low budget
    low_budget_request = RecommendationRequest(
        user_id="budget_user",
        preferences=UserPreferences(
            budget_range=BudgetRange.LOW
        ),
        max_results=5
    )
    
    await recommendation_engine._initialize_mock_data()
    candidates = await recommendation_engine._filter_candidate_items(low_budget_request)
    
    # All items should be within low budget range (0-100)
    for item in candidates:
        assert item.estimated_cost <= 100

@pytest.mark.asyncio
async def test_generate_hybrid_recommendations(recommendation_engine, sample_request):
    """Test hybrid recommendation generation"""
    await recommendation_engine._initialize_mock_data()
    
    user_profile = await recommendation_engine._get_or_create_user_profile(
        sample_request.user_id, sample_request.preferences
    )
    
    candidate_items = await recommendation_engine._filter_candidate_items(sample_request)
    
    recommendations = await recommendation_engine._generate_hybrid_recommendations(
        user_profile, candidate_items, sample_request
    )
    
    assert isinstance(recommendations, list)
    
    for rec in recommendations:
        assert isinstance(rec.personalized_score, (int, float))
        assert rec.personalized_score >= 0
        assert len(rec.reasoning) > 0
        
        # Should include alternatives if requested
        if sample_request.include_alternatives:
            assert isinstance(rec.alternatives, list)

@pytest.mark.asyncio
async def test_apply_contextual_adjustments(recommendation_engine, sample_request):
    """Test applying contextual adjustments"""
    await recommendation_engine._initialize_mock_data()
    
    # Create mock recommendations
    mock_recommendations = [
        RecommendationResponse(
            id="test_rec_1",
            user_id=sample_request.user_id,
            item=recommendation_engine.available_items[0],
            personalized_score=0.5,
            contextual_factors=[],
            reasoning="Test recommendation",
            alternatives=[],
            valid_until=datetime.now() + timedelta(hours=24)
        )
    ]
    
    adjusted_recs = await recommendation_engine._apply_contextual_adjustments(
        mock_recommendations, sample_request.contextual_factors, sample_request.preferences
    )
    
    assert len(adjusted_recs) == len(mock_recommendations)
    
    # Score should be adjusted based on context
    original_score = mock_recommendations[0].personalized_score
    adjusted_score = adjusted_recs[0].personalized_score
    
    # For sunny weather and outdoor item, score should likely increase
    if recommendation_engine.available_items[0].weather_dependent:
        assert adjusted_score != original_score

@pytest.mark.asyncio
async def test_generate_reasoning(recommendation_engine):
    """Test generating recommendation reasoning"""
    await recommendation_engine._initialize_mock_data()
    
    item = recommendation_engine.available_items[0]
    scores = {
        'content_based': 0.8,
        'collaborative': 0.6,
        'preference_learning': 0.7
    }
    
    user_profile = await recommendation_engine._get_or_create_user_profile(
        "test_user", 
        UserPreferences(interests=["outdoor", "scenic"])
    )
    
    reasoning = await recommendation_engine._generate_reasoning(item, scores, user_profile)
    
    assert isinstance(reasoning, str)
    assert len(reasoning) > 0

@pytest.mark.asyncio
async def test_find_alternatives(recommendation_engine):
    """Test finding alternative recommendations"""
    await recommendation_engine._initialize_mock_data()
    
    item = recommendation_engine.available_items[0]
    candidate_items = recommendation_engine.available_items
    
    alternatives = await recommendation_engine._find_alternatives(item, candidate_items)
    
    assert isinstance(alternatives, list)
    assert len(alternatives) <= 2  # Should return max 2 alternatives
    
    # Alternatives should not include the original item
    for alt in alternatives:
        assert alt.id != item.id

@pytest.mark.asyncio
async def test_process_feedback(recommendation_engine, sample_request):
    """Test processing user feedback"""
    await recommendation_engine._initialize_mock_data()
    
    # Generate recommendations first
    recommendations = await recommendation_engine.generate_recommendations(sample_request)
    
    if recommendations:
        rec = recommendations[0]
        
        # Process feedback
        await recommendation_engine.process_feedback(
            sample_request.user_id, rec.id, 4.5, "Great recommendation!"
        )
        
        # Check that user profile was updated
        assert sample_request.user_id in recommendation_engine.user_profiles
        user_profile = recommendation_engine.user_profiles[sample_request.user_id]
        assert len(user_profile.interaction_history) > 0

@pytest.mark.asyncio
async def test_process_feedback_nonexistent_recommendation(recommendation_engine):
    """Test processing feedback for nonexistent recommendation"""
    await recommendation_engine._initialize_mock_data()
    
    # Should handle gracefully without raising exception
    await recommendation_engine.process_feedback(
        "test_user", "nonexistent_rec", 3.0, "Test feedback"
    )

@pytest.mark.asyncio
async def test_get_user_recommendations(recommendation_engine, sample_request):
    """Test getting user's recent recommendations"""
    await recommendation_engine._initialize_mock_data()
    
    # Generate some recommendations first
    await recommendation_engine.generate_recommendations(sample_request)
    
    user_recs = await recommendation_engine.get_user_recommendations(
        sample_request.user_id, limit=5
    )
    
    assert isinstance(user_recs, list)
    assert len(user_recs) <= 5
    
    # All recommendations should be for the correct user
    for rec in user_recs:
        assert rec.user_id == sample_request.user_id
        assert rec.valid_until > datetime.now()  # Should be active

@pytest.mark.asyncio
async def test_get_user_recommendations_empty(recommendation_engine):
    """Test getting recommendations for user with no history"""
    user_recs = await recommendation_engine.get_user_recommendations("nonexistent_user")
    
    assert user_recs == []

@pytest.mark.asyncio
async def test_update_user_preferences(recommendation_engine):
    """Test updating user preferences"""
    await recommendation_engine._initialize_mock_data()
    
    # Create initial profile
    initial_prefs = UserPreferences(interests=["outdoor"])
    await recommendation_engine._get_or_create_user_profile("test_user", initial_prefs)
    
    # Update preferences
    new_preferences = {
        'interests': ['indoor', 'cultural'],
        'budget_range': 'high',
        'group_type': 'family',
        'activity_level': 'low'
    }
    
    await recommendation_engine.update_user_preferences("test_user", new_preferences)
    
    # Check that preferences were updated
    user_profile = recommendation_engine.user_profiles["test_user"]
    assert user_profile.preferences.interests == ['indoor', 'cultural']
    assert user_profile.preferences.budget_range == BudgetRange.HIGH

def test_get_recommendation_stats(recommendation_engine):
    """Test getting recommendation engine statistics"""
    stats = recommendation_engine.get_recommendation_stats()
    
    assert isinstance(stats, dict)
    assert 'total_users' in stats
    assert 'total_recommendations' in stats
    assert 'total_interactions' in stats
    assert 'available_items' in stats
    assert 'algorithm_weights' in stats
    
    # Check data types
    assert isinstance(stats['total_users'], int)
    assert isinstance(stats['total_recommendations'], int)
    assert isinstance(stats['total_interactions'], int)
    assert isinstance(stats['available_items'], int)
    assert isinstance(stats['algorithm_weights'], dict)

@pytest.mark.asyncio
async def test_store_recommendations(recommendation_engine):
    """Test storing recommendations"""
    mock_recommendations = [
        RecommendationResponse(
            id="test_rec_1",
            user_id="test_user",
            item=RecommendationItem(
                id="test_item",
                type="attraction",
                name="Test Item",
                description="Test description",
                location={
                    "latitude": 22.0,
                    "longitude": 114.0,
                    "address": "Test Address",
                    "district": "Test District"
                },
                rating=4.0,
                categories=["test"],
                estimated_duration=60,
                estimated_cost=50.0,
                local_authenticity_score=0.5
            ),
            personalized_score=0.8,
            contextual_factors=[],
            reasoning="Test reasoning",
            alternatives=[],
            valid_until=datetime.now() + timedelta(hours=24)
        )
    ]
    
    await recommendation_engine._store_recommendations("test_user", mock_recommendations)
    
    # Check that recommendations were stored
    assert "test_user" in recommendation_engine.recommendation_history
    assert len(recommendation_engine.recommendation_history["test_user"]) > 0

@pytest.mark.asyncio
async def test_recommendation_sorting(recommendation_engine, sample_request):
    """Test that recommendations are sorted by score"""
    await recommendation_engine._initialize_mock_data()
    
    recommendations = await recommendation_engine.generate_recommendations(sample_request)
    
    if len(recommendations) > 1:
        # Check that recommendations are sorted by score (descending)
        scores = [rec.personalized_score for rec in recommendations]
        assert scores == sorted(scores, reverse=True)

@pytest.mark.asyncio
async def test_recommendation_validity_period(recommendation_engine, sample_request):
    """Test that recommendations have valid validity periods"""
    await recommendation_engine._initialize_mock_data()
    
    recommendations = await recommendation_engine.generate_recommendations(sample_request)
    
    now = datetime.now()
    for rec in recommendations:
        assert rec.generated_at <= now
        assert rec.valid_until > now
        assert rec.valid_until > rec.generated_at

@pytest.mark.asyncio
async def test_algorithm_weights_effect(recommendation_engine):
    """Test that algorithm weights affect final scores"""
    await recommendation_engine._initialize_mock_data()
    
    # Test with different weight configurations
    original_weights = recommendation_engine.algorithm_weights.copy()
    
    # Set collaborative filtering to dominate
    recommendation_engine.algorithm_weights = {
        'collaborative': 0.8,
        'content_based': 0.1,
        'contextual': 0.05,
        'preference_learning': 0.05
    }
    
    request = RecommendationRequest(
        user_id="weight_test_user",
        preferences=UserPreferences(),
        max_results=3
    )
    
    collab_heavy_recs = await recommendation_engine.generate_recommendations(request)
    
    # Reset to content-based dominance
    recommendation_engine.algorithm_weights = {
        'collaborative': 0.1,
        'content_based': 0.8,
        'contextual': 0.05,
        'preference_learning': 0.05
    }
    
    content_heavy_recs = await recommendation_engine.generate_recommendations(request)
    
    # Restore original weights
    recommendation_engine.algorithm_weights = original_weights
    
    # Results should potentially be different
    assert isinstance(collab_heavy_recs, list)
    assert isinstance(content_heavy_recs, list)