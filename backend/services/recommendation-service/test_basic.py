"""
Basic test script to verify core recommendation logic without external dependencies
"""
import sys
import os
import asyncio
from datetime import datetime

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_basic_imports():
    """Test that all modules can be imported"""
    try:
        print("Testing imports...")
        
        # Test model imports
        from models.recommendation import (
            RecommendationRequest, RecommendationResponse, RecommendationItem,
            UserPreferences, ContextualFactor, ContextType
        )
        print("✅ Models imported successfully")
        
        # Test service imports
        from services.collaborative_filtering import CollaborativeFilteringService
        from services.content_based_filtering import ContentBasedFilteringService
        from services.contextual_scoring import ContextualScoringService
        from services.preference_learning import PreferenceLearningService
        from services.recommendation_engine import RecommendationEngine
        print("✅ Services imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_basic_functionality():
    """Test basic functionality without external dependencies"""
    try:
        print("\nTesting basic functionality...")
        
        # Test collaborative filtering service initialization
        from services.collaborative_filtering import CollaborativeFilteringService
        collab_service = CollaborativeFilteringService()
        print("✅ Collaborative filtering service created")
        
        # Test content-based filtering service initialization
        from services.content_based_filtering import ContentBasedFilteringService
        content_service = ContentBasedFilteringService()
        print("✅ Content-based filtering service created")
        
        # Test contextual scoring service initialization
        from services.contextual_scoring import ContextualScoringService
        contextual_service = ContextualScoringService()
        print("✅ Contextual scoring service created")
        
        # Test preference learning service initialization
        from services.preference_learning import PreferenceLearningService
        preference_service = PreferenceLearningService()
        print("✅ Preference learning service created")
        
        # Test recommendation engine initialization
        from services.recommendation_engine import RecommendationEngine
        engine = RecommendationEngine()
        print("✅ Recommendation engine created")
        
        return True
        
    except Exception as e:
        print(f"❌ Functionality test error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_algorithm_logic():
    """Test core algorithm logic"""
    try:
        print("\nTesting algorithm logic...")
        
        from services.contextual_scoring import ContextualScoringService
        contextual_service = ContextualScoringService()
        
        # Test crowd level encoding
        assert contextual_service._encode_crowd_level("very_low") == 0.0
        assert contextual_service._encode_crowd_level("moderate") == 0.5
        assert contextual_service._encode_crowd_level("very_high") == 1.0
        print("✅ Crowd level encoding works")
        
        # Test time period classification
        assert contextual_service._get_time_period(8) == "morning"
        assert contextual_service._get_time_period(14) == "afternoon"
        assert contextual_service._get_time_period(20) == "evening"
        assert contextual_service._get_time_period(2) == "night"
        print("✅ Time period classification works")
        
        # Test distance calculation
        distance = contextual_service._calculate_distance(22.0, 114.0, 22.1, 114.1)
        assert isinstance(distance, float)
        assert distance > 0
        print("✅ Distance calculation works")
        
        from services.preference_learning import PreferenceLearningService
        pref_service = PreferenceLearningService()
        
        # Test interaction weights
        from models.recommendation import UserInteraction
        interaction = UserInteraction(
            user_id="test",
            item_id="test",
            interaction_type="rate",
            rating=4.0,
            timestamp=datetime.now()
        )
        weight = pref_service._get_interaction_weight(interaction)
        assert weight > 0
        print("✅ Interaction weight calculation works")
        
        return True
        
    except Exception as e:
        print(f"❌ Algorithm logic test error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_async_functionality():
    """Test async functionality"""
    try:
        print("\nTesting async functionality...")
        
        from services.collaborative_filtering import CollaborativeFilteringService
        from models.recommendation import UserProfile, UserPreferences
        
        collab_service = CollaborativeFilteringService()
        
        # Test building empty user-item matrix
        matrix = await collab_service.build_user_item_matrix([])
        assert matrix.shape == (0, 0)
        print("✅ Empty user-item matrix handling works")
        
        # Test finding similar users with empty data
        similar_users = await collab_service.find_similar_users("nonexistent_user")
        assert similar_users == []
        print("✅ Empty similar users handling works")
        
        from services.preference_learning import PreferenceLearningService
        pref_service = PreferenceLearningService()
        
        # Test getting preferences for nonexistent user
        prefs = await pref_service.get_learned_preferences("nonexistent_user")
        assert prefs == {}
        print("✅ Empty preferences handling works")
        
        return True
        
    except Exception as e:
        print(f"❌ Async functionality test error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Basic Recommendation Engine Tests")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 4
    
    # Test imports
    if test_basic_imports():
        tests_passed += 1
    
    # Test basic functionality
    if test_basic_functionality():
        tests_passed += 1
    
    # Test algorithm logic
    if test_algorithm_logic():
        tests_passed += 1
    
    # Test async functionality
    if await test_async_functionality():
        tests_passed += 1
    
    print(f"\n📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Recommendation engine is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the implementation.")
    
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())