"""
Demo script for AI Recommendation Engine
"""
import asyncio
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from models.recommendation import (
    RecommendationRequest, UserPreferences, ContextualFactor, ContextType,
    BudgetRange, GroupType, ActivityLevel, RecommendationType
)
from services.recommendation_engine import RecommendationEngine

async def demo_basic_recommendations():
    """Demo basic recommendation generation"""
    print("🚀 Starting AI Recommendation Engine Demo")
    print("=" * 50)
    
    # Initialize recommendation engine
    engine = RecommendationEngine()
    await engine._initialize_mock_data()
    
    print(f"✅ Initialized with {len(engine.available_items)} items")
    
    # Create sample request
    request = RecommendationRequest(
        user_id="demo_user",
        preferences=UserPreferences(
            interests=["outdoor", "scenic", "hiking"],
            budget_range=BudgetRange.MEDIUM,
            group_type=GroupType.SOLO,
            activity_level=ActivityLevel.HIGH
        ),
        contextual_factors=[
            ContextualFactor(
                type=ContextType.WEATHER,
                value={"condition": "sunny", "temperature": 25, "humidity": 60},
                impact=0.8,
                confidence=0.9,
                description="Perfect sunny weather"
            ),
            ContextualFactor(
                type=ContextType.TIME,
                value={"current_time": "10:00"},
                impact=0.6,
                confidence=1.0,
                description="Morning time"
            )
        ],
        recommendation_types=[RecommendationType.ATTRACTION, RecommendationType.ACTIVITY],
        max_results=3,
        include_alternatives=True
    )
    
    print("\n📋 User Profile:")
    print(f"   Interests: {request.preferences.interests}")
    print(f"   Budget: {request.preferences.budget_range.value}")
    print(f"   Group: {request.preferences.group_type.value}")
    print(f"   Activity Level: {request.preferences.activity_level.value}")
    
    print("\n🌤️  Context:")
    for factor in request.contextual_factors:
        print(f"   {factor.type.value}: {factor.description}")
    
    # Generate recommendations
    print("\n🎯 Generating Recommendations...")
    recommendations = await engine.generate_recommendations(request)
    
    print(f"\n✨ Generated {len(recommendations)} recommendations:")
    print("-" * 50)
    
    for i, rec in enumerate(recommendations, 1):
        print(f"\n{i}. {rec.item.name}")
        print(f"   Type: {rec.item.type}")
        print(f"   Score: {rec.personalized_score:.3f}")
        print(f"   Rating: {rec.item.rating}/5.0")
        print(f"   Duration: {rec.item.estimated_duration} minutes")
        print(f"   Cost: HK${rec.item.estimated_cost}")
        print(f"   Categories: {', '.join(rec.item.categories)}")
        print(f"   Reasoning: {rec.reasoning}")
        
        if rec.alternatives:
            print(f"   Alternatives: {len(rec.alternatives)} options")
            for alt in rec.alternatives[:2]:  # Show first 2 alternatives
                print(f"     - {alt.name} (Rating: {alt.rating})")

async def demo_feedback_learning():
    """Demo feedback processing and preference learning"""
    print("\n\n🧠 Preference Learning Demo")
    print("=" * 50)
    
    engine = RecommendationEngine()
    await engine._initialize_mock_data()
    
    user_id = "learning_user"
    
    # Initial request
    initial_request = RecommendationRequest(
        user_id=user_id,
        preferences=UserPreferences(
            interests=["dining"],
            budget_range=BudgetRange.MEDIUM
        ),
        max_results=2
    )
    
    print("📊 Initial recommendations:")
    initial_recs = await engine.generate_recommendations(initial_request)
    
    for rec in initial_recs:
        print(f"   {rec.item.name} - Score: {rec.personalized_score:.3f}")
    
    # Simulate user feedback
    if initial_recs:
        print("\n💬 Processing user feedback...")
        
        # Positive feedback for first recommendation
        await engine.process_feedback(
            user_id, initial_recs[0].id, 5.0, 
            "Amazing authentic local food, very affordable!"
        )
        
        # Negative feedback for expensive option (if exists)
        if len(initial_recs) > 1:
            await engine.process_feedback(
                user_id, initial_recs[1].id, 2.0,
                "Too expensive and touristy"
            )
    
    # Generate new recommendations after learning
    print("\n🔄 Recommendations after learning:")
    learned_recs = await engine.generate_recommendations(initial_request)
    
    for rec in learned_recs:
        print(f"   {rec.item.name} - Score: {rec.personalized_score:.3f}")
    
    # Show learned preferences
    learned_prefs = await engine.preference_service.get_learned_preferences(user_id)
    if learned_prefs:
        print("\n🎓 Learned preferences:")
        sorted_prefs = sorted(learned_prefs.items(), key=lambda x: abs(x[1]), reverse=True)
        for pref, value in sorted_prefs[:5]:
            print(f"   {pref}: {value:.3f}")

async def demo_contextual_scoring():
    """Demo contextual scoring effects"""
    print("\n\n🌦️  Contextual Scoring Demo")
    print("=" * 50)
    
    engine = RecommendationEngine()
    await engine._initialize_mock_data()
    
    base_request = RecommendationRequest(
        user_id="context_user",
        preferences=UserPreferences(
            interests=["outdoor", "scenic"]
        ),
        max_results=2
    )
    
    # Test different weather conditions
    weather_conditions = [
        ("sunny", "Perfect sunny day"),
        ("rainy", "Heavy rain expected"),
        ("stormy", "Thunderstorm warning")
    ]
    
    for condition, description in weather_conditions:
        print(f"\n☀️ Weather: {condition.title()}")
        
        request = RecommendationRequest(
            user_id=base_request.user_id,
            preferences=base_request.preferences,
            contextual_factors=[
                ContextualFactor(
                    type=ContextType.WEATHER,
                    value={"condition": condition, "temperature": 25},
                    impact=0.8,
                    confidence=1.0,
                    description=description
                )
            ],
            max_results=2
        )
        
        recommendations = await engine.generate_recommendations(request)
        
        for rec in recommendations:
            weather_dependent = "🌤️" if rec.item.weather_dependent else "🏠"
            print(f"   {weather_dependent} {rec.item.name}: {rec.personalized_score:.3f}")

async def demo_collaborative_filtering():
    """Demo collaborative filtering with similar users"""
    print("\n\n👥 Collaborative Filtering Demo")
    print("=" * 50)
    
    engine = RecommendationEngine()
    await engine._initialize_mock_data()
    
    # Create multiple users with interactions
    users_data = [
        ("outdoor_lover", ["outdoor", "hiking"], [("item_1", 5.0), ("item_3", 4.5)]),
        ("culture_fan", ["cultural", "indoor"], [("item_2", 5.0)]),
        ("similar_outdoor", ["outdoor", "scenic"], [("item_1", 4.0)])
    ]
    
    # Simulate user interactions
    for user_id, interests, interactions in users_data:
        # Create user profile
        profile = await engine._get_or_create_user_profile(
            user_id, 
            UserPreferences(interests=interests)
        )
        
        # Add interactions
        from models.recommendation import UserInteraction
        from datetime import datetime
        
        for item_id, rating in interactions:
            interaction = UserInteraction(
                user_id=user_id,
                item_id=item_id,
                interaction_type="rate",
                rating=rating,
                timestamp=datetime.now()
            )
            profile.interaction_history.append(interaction)
    
    # Build collaborative filtering model
    user_profiles = list(engine.user_profiles.values())
    await engine.collaborative_service.build_user_item_matrix(user_profiles)
    await engine.collaborative_service.compute_user_similarities()
    
    # Find similar users
    similar_users = await engine.collaborative_service.find_similar_users("outdoor_lover", top_k=2)
    
    print("🔍 Similar users to 'outdoor_lover':")
    for user_id, similarity in similar_users:
        print(f"   {user_id}: {similarity:.3f} similarity")
    
    # Generate collaborative recommendations
    collab_recs = await engine.collaborative_service.generate_collaborative_recommendations(
        "outdoor_lover", engine.available_items, top_k=3
    )
    
    print("\n🎯 Collaborative recommendations:")
    for item, score in collab_recs:
        print(f"   {item.name}: {score:.3f}")

async def main():
    """Run all demos"""
    try:
        await demo_basic_recommendations()
        await demo_feedback_learning()
        await demo_contextual_scoring()
        await demo_collaborative_filtering()
        
        print("\n\n🎉 Demo completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n❌ Demo failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())