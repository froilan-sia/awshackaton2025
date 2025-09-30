"""
Tests for Collaborative Filtering Service
"""
import pytest
import numpy as np
from datetime import datetime

from src.services.collaborative_filtering import CollaborativeFilteringService
from src.models.recommendation import (
    UserProfile, UserInteraction, UserPreferences, RecommendationItem,
    BudgetRange, GroupType, ActivityLevel
)

@pytest.fixture
def collaborative_service():
    return CollaborativeFilteringService()

@pytest.fixture
def sample_user_profiles():
    """Create sample user profiles for testing"""
    profiles = []
    
    # User 1: Likes outdoor activities
    profile1 = UserProfile(
        user_id="user_1",
        preferences=UserPreferences(
            interests=["outdoor", "hiking"],
            budget_range=BudgetRange.MEDIUM,
            group_type=GroupType.SOLO,
            activity_level=ActivityLevel.HIGH
        ),
        interaction_history=[
            UserInteraction(
                user_id="user_1",
                item_id="item_1",
                interaction_type="rate",
                rating=5.0,
                timestamp=datetime.now()
            ),
            UserInteraction(
                user_id="user_1",
                item_id="item_3",
                interaction_type="visit",
                rating=4.0,
                timestamp=datetime.now()
            )
        ]
    )
    
    # User 2: Similar to User 1
    profile2 = UserProfile(
        user_id="user_2",
        preferences=UserPreferences(
            interests=["outdoor", "scenic"],
            budget_range=BudgetRange.MEDIUM,
            group_type=GroupType.COUPLE,
            activity_level=ActivityLevel.HIGH
        ),
        interaction_history=[
            UserInteraction(
                user_id="user_2",
                item_id="item_1",
                interaction_type="rate",
                rating=4.5,
                timestamp=datetime.now()
            ),
            UserInteraction(
                user_id="user_2",
                item_id="item_2",
                interaction_type="like",
                timestamp=datetime.now()
            )
        ]
    )
    
    # User 3: Different preferences (indoor activities)
    profile3 = UserProfile(
        user_id="user_3",
        preferences=UserPreferences(
            interests=["dining", "cultural"],
            budget_range=BudgetRange.HIGH,
            group_type=GroupType.FAMILY,
            activity_level=ActivityLevel.LOW
        ),
        interaction_history=[
            UserInteraction(
                user_id="user_3",
                item_id="item_2",
                interaction_type="rate",
                rating=5.0,
                timestamp=datetime.now()
            ),
            UserInteraction(
                user_id="user_3",
                item_id="item_4",
                interaction_type="visit",
                rating=4.0,
                timestamp=datetime.now()
            )
        ]
    )
    
    return [profile1, profile2, profile3]

@pytest.fixture
def sample_items():
    """Create sample recommendation items"""
    return [
        RecommendationItem(
            id="item_1",
            type="attraction",
            name="Victoria Peak",
            description="Mountain peak with city views",
            location={
                "latitude": 22.2783,
                "longitude": 114.1747,
                "address": "Victoria Peak, Hong Kong",
                "district": "Central"
            },
            rating=4.5,
            categories=["outdoor", "scenic"],
            estimated_duration=180,
            estimated_cost=65.0,
            local_authenticity_score=0.6
        ),
        RecommendationItem(
            id="item_2",
            type="restaurant",
            name="Tim Ho Wan",
            description="Michelin-starred dim sum",
            location={
                "latitude": 22.2793,
                "longitude": 114.1628,
                "address": "Central, Hong Kong",
                "district": "Central"
            },
            rating=4.3,
            categories=["dining", "dim sum"],
            estimated_duration=90,
            estimated_cost=150.0,
            local_authenticity_score=0.9
        ),
        RecommendationItem(
            id="item_3",
            type="activity",
            name="Dragon's Back Hike",
            description="Scenic hiking trail",
            location={
                "latitude": 22.2400,
                "longitude": 114.2500,
                "address": "Shek O, Hong Kong",
                "district": "Southern"
            },
            rating=4.7,
            categories=["outdoor", "hiking"],
            estimated_duration=240,
            estimated_cost=0.0,
            local_authenticity_score=0.8
        )
    ]

@pytest.mark.asyncio
async def test_build_user_item_matrix(collaborative_service, sample_user_profiles):
    """Test building user-item interaction matrix"""
    matrix = await collaborative_service.build_user_item_matrix(sample_user_profiles)
    
    assert matrix is not None
    assert matrix.shape[0] == len(sample_user_profiles)  # Number of users
    assert matrix.shape[1] > 0  # Number of items
    assert collaborative_service.user_item_matrix is not None

@pytest.mark.asyncio
async def test_compute_user_similarities(collaborative_service, sample_user_profiles):
    """Test computing user-user similarities"""
    await collaborative_service.build_user_item_matrix(sample_user_profiles)
    similarities = await collaborative_service.compute_user_similarities()
    
    assert similarities is not None
    assert len(similarities) == len(sample_user_profiles)
    
    # Check that similarities are computed for each user
    for user_id in ["user_1", "user_2", "user_3"]:
        assert user_id in similarities
        assert len(similarities[user_id]) == len(sample_user_profiles) - 1

@pytest.mark.asyncio
async def test_find_similar_users(collaborative_service, sample_user_profiles):
    """Test finding similar users"""
    await collaborative_service.build_user_item_matrix(sample_user_profiles)
    await collaborative_service.compute_user_similarities()
    
    similar_users = await collaborative_service.find_similar_users("user_1", top_k=2)
    
    assert isinstance(similar_users, list)
    assert len(similar_users) <= 2
    
    # Check that results are tuples of (user_id, similarity_score)
    for user_id, similarity in similar_users:
        assert isinstance(user_id, str)
        assert isinstance(similarity, (int, float))
        assert -1 <= similarity <= 1

@pytest.mark.asyncio
async def test_generate_collaborative_recommendations(
    collaborative_service, sample_user_profiles, sample_items
):
    """Test generating collaborative filtering recommendations"""
    await collaborative_service.build_user_item_matrix(sample_user_profiles)
    await collaborative_service.compute_user_similarities()
    
    recommendations = await collaborative_service.generate_collaborative_recommendations(
        "user_1", sample_items, top_k=5
    )
    
    assert isinstance(recommendations, list)
    
    # Check recommendation format
    for item, score in recommendations:
        assert isinstance(item, RecommendationItem)
        assert isinstance(score, (int, float))
        assert score >= 0

@pytest.mark.asyncio
async def test_update_user_interactions(collaborative_service, sample_user_profiles):
    """Test updating user interactions"""
    await collaborative_service.build_user_item_matrix(sample_user_profiles)
    
    new_interactions = [
        UserInteraction(
            user_id="user_1",
            item_id="new_item",
            interaction_type="rate",
            rating=4.0,
            timestamp=datetime.now()
        )
    ]
    
    await collaborative_service.update_user_interactions("user_1", new_interactions)
    
    # Check that user profile was updated
    assert "user_1" in collaborative_service.user_profiles
    user_profile = collaborative_service.user_profiles["user_1"]
    assert len(user_profile.interaction_history) > 0

def test_get_interaction_weight(collaborative_service):
    """Test interaction weight calculation"""
    # Test different interaction types
    view_interaction = UserInteraction(
        user_id="test",
        item_id="test",
        interaction_type="view",
        timestamp=datetime.now()
    )
    
    rate_interaction = UserInteraction(
        user_id="test",
        item_id="test",
        interaction_type="rate",
        rating=4.0,
        timestamp=datetime.now()
    )
    
    view_weight = collaborative_service._get_interaction_weight(view_interaction)
    rate_weight = collaborative_service._get_interaction_weight(rate_interaction)
    
    assert view_weight > 0
    assert rate_weight > view_weight  # Rating should have higher weight

def test_get_user_similarity_stats(collaborative_service, sample_user_profiles):
    """Test getting user similarity statistics"""
    # Mock similarity data
    collaborative_service.user_similarities = {
        "user_1": {"user_2": 0.8, "user_3": 0.2}
    }
    
    stats = collaborative_service.get_user_similarity_stats("user_1")
    
    assert isinstance(stats, dict)
    assert "mean_similarity" in stats
    assert "max_similarity" in stats
    assert "min_similarity" in stats
    assert "std_similarity" in stats
    assert "num_similar_users" in stats

@pytest.mark.asyncio
async def test_empty_user_profiles(collaborative_service):
    """Test handling empty user profiles"""
    matrix = await collaborative_service.build_user_item_matrix([])
    assert matrix.shape == (0, 0)

@pytest.mark.asyncio
async def test_user_with_no_interactions(collaborative_service, sample_items):
    """Test recommendations for user with no interaction history"""
    # Create user profile with no interactions
    empty_profile = UserProfile(
        user_id="empty_user",
        preferences=UserPreferences(),
        interaction_history=[]
    )
    
    await collaborative_service.build_user_item_matrix([empty_profile])
    await collaborative_service.compute_user_similarities()
    
    recommendations = await collaborative_service.generate_collaborative_recommendations(
        "empty_user", sample_items, top_k=5
    )
    
    # Should return empty list or handle gracefully
    assert isinstance(recommendations, list)