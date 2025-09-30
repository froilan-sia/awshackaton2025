"""
Main Recommendation Engine that orchestrates all recommendation services
"""
import asyncio
import numpy as np
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import logging

from ..models.recommendation import (
    RecommendationRequest, RecommendationResponse, RecommendationItem,
    UserProfile, UserInteraction, ContextualFactor, UserPreferences
)
from .collaborative_filtering import CollaborativeFilteringService
from .content_based_filtering import ContentBasedFilteringService
from .contextual_scoring import ContextualScoringService
from .preference_learning import PreferenceLearningService

logger = logging.getLogger(__name__)

class RecommendationEngine:
    """
    Main recommendation engine that combines multiple recommendation approaches
    """
    
    def __init__(self):
        self.collaborative_service = CollaborativeFilteringService()
        self.content_service = ContentBasedFilteringService()
        self.contextual_service = ContextualScoringService()
        self.preference_service = PreferenceLearningService()
        
        # Weights for combining different recommendation approaches
        self.algorithm_weights = {
            'collaborative': 0.3,
            'content_based': 0.4,
            'contextual': 0.2,
            'preference_learning': 0.1
        }
        
        # Mock data storage (in production, this would be a database)
        self.user_profiles = {}
        self.available_items = []
        self.recommendation_history = {}
        
        # Initialize with mock data
        asyncio.create_task(self._initialize_mock_data())
    
    async def _initialize_mock_data(self):
        """
        Initialize with mock data for testing
        """
        try:
            # Mock items
            self.available_items = [
                RecommendationItem(
                    id="item_1",
                    type="attraction",
                    name="Victoria Peak",
                    description="Iconic mountain peak with panoramic city views",
                    location={
                        "latitude": 22.2783,
                        "longitude": 114.1747,
                        "address": "Victoria Peak, Hong Kong",
                        "district": "Central"
                    },
                    rating=4.5,
                    categories=["outdoor", "scenic", "tourist", "mountain"],
                    estimated_duration=180,
                    estimated_cost=65.0,
                    weather_dependent=True,
                    crowd_level="high",
                    local_authenticity_score=0.6
                ),
                RecommendationItem(
                    id="item_2",
                    type="restaurant",
                    name="Tim Ho Wan",
                    description="Michelin-starred dim sum restaurant",
                    location={
                        "latitude": 22.2793,
                        "longitude": 114.1628,
                        "address": "Central, Hong Kong",
                        "district": "Central"
                    },
                    rating=4.3,
                    categories=["dining", "dim sum", "local", "authentic"],
                    estimated_duration=90,
                    estimated_cost=150.0,
                    weather_dependent=False,
                    crowd_level="moderate",
                    local_authenticity_score=0.9
                ),
                RecommendationItem(
                    id="item_3",
                    type="activity",
                    name="Star Ferry Ride",
                    description="Historic ferry crossing Victoria Harbour",
                    location={
                        "latitude": 22.2944,
                        "longitude": 114.1694,
                        "address": "Tsim Sha Tsui, Hong Kong",
                        "district": "Tsim Sha Tsui"
                    },
                    rating=4.2,
                    categories=["transport", "scenic", "historic", "water"],
                    estimated_duration=30,
                    estimated_cost=3.0,
                    weather_dependent=True,
                    crowd_level="low",
                    local_authenticity_score=0.8
                )
            ]
            
            # Build item features for content-based filtering
            await self.content_service.build_item_features(self.available_items)
            
        except Exception as e:
            logger.error(f"Error initializing mock data: {str(e)}")
    
    async def generate_recommendations(
        self, 
        request: RecommendationRequest
    ) -> List[RecommendationResponse]:
        """
        Generate personalized recommendations using hybrid approach
        """
        try:
            # Get or create user profile
            user_profile = await self._get_or_create_user_profile(
                request.user_id, request.preferences
            )
            
            # Update learned preferences
            learned_prefs = await self.preference_service.learn_from_interactions(
                request.user_id, user_profile.interaction_history, self.available_items
            )
            
            # Filter items based on request
            candidate_items = await self._filter_candidate_items(request)
            
            if not candidate_items:
                return []
            
            # Generate recommendations using different approaches
            recommendations = await self._generate_hybrid_recommendations(
                user_profile, candidate_items, request
            )
            
            # Apply contextual scoring
            if request.contextual_factors:
                recommendations = await self._apply_contextual_adjustments(
                    recommendations, request.contextual_factors, request.preferences
                )
            
            # Sort and limit results
            recommendations.sort(key=lambda x: x.personalized_score, reverse=True)
            final_recommendations = recommendations[:request.max_results]
            
            # Store recommendations for feedback processing
            await self._store_recommendations(request.user_id, final_recommendations)
            
            return final_recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return []
    
    async def _get_or_create_user_profile(
        self, 
        user_id: str, 
        preferences: UserPreferences
    ) -> UserProfile:
        """
        Get existing user profile or create new one
        """
        try:
            if user_id not in self.user_profiles:
                self.user_profiles[user_id] = UserProfile(
                    user_id=user_id,
                    preferences=preferences,
                    interaction_history=[],
                    learned_preferences={},
                    similarity_scores={}
                )
            else:
                # Update preferences
                self.user_profiles[user_id].preferences = preferences
            
            return self.user_profiles[user_id]
            
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            return UserProfile(
                user_id=user_id,
                preferences=preferences,
                interaction_history=[],
                learned_preferences={},
                similarity_scores={}
            )
    
    async def _filter_candidate_items(
        self, 
        request: RecommendationRequest
    ) -> List[RecommendationItem]:
        """
        Filter items based on request criteria
        """
        try:
            candidates = self.available_items.copy()
            
            # Filter by recommendation types
            if request.recommendation_types:
                type_strings = [rt.value for rt in request.recommendation_types]
                candidates = [
                    item for item in candidates 
                    if item.type in type_strings
                ]
            
            # Filter by budget (if specified in preferences)
            budget_ranges = {
                'low': (0, 100),
                'medium': (0, 300),
                'high': (0, 800),
                'luxury': (0, float('inf'))
            }
            
            budget_range = budget_ranges.get(request.preferences.budget_range.value, (0, float('inf')))
            candidates = [
                item for item in candidates
                if budget_range[0] <= item.estimated_cost <= budget_range[1]
            ]
            
            # Filter by dietary restrictions (for restaurants)
            if request.preferences.dietary_restrictions:
                # This would be more sophisticated in production
                candidates = [
                    item for item in candidates
                    if item.type != 'restaurant' or 
                    not any(restriction in item.description.lower() 
                           for restriction in request.preferences.dietary_restrictions)
                ]
            
            return candidates
            
        except Exception as e:
            logger.error(f"Error filtering candidate items: {str(e)}")
            return self.available_items
    
    async def _generate_hybrid_recommendations(
        self,
        user_profile: UserProfile,
        candidate_items: List[RecommendationItem],
        request: RecommendationRequest
    ) -> List[RecommendationResponse]:
        """
        Generate recommendations using hybrid approach
        """
        try:
            recommendations = []
            
            # Generate base scores for each item
            for item in candidate_items:
                # Initialize recommendation response
                rec_response = RecommendationResponse(
                    id=f"rec_{item.id}_{datetime.now().timestamp()}",
                    user_id=request.user_id,
                    item=item,
                    personalized_score=0.0,
                    contextual_factors=request.contextual_factors,
                    reasoning="",
                    alternatives=[],
                    valid_until=datetime.now() + timedelta(hours=24)
                )
                
                # Calculate scores from different approaches
                scores = {}
                
                # Content-based score
                content_recs = await self.content_service.generate_content_based_recommendations(
                    user_profile, [item], top_k=1
                )
                scores['content_based'] = content_recs[0][1] if content_recs else 0.5
                
                # Collaborative filtering score
                collab_recs = await self.collaborative_service.generate_collaborative_recommendations(
                    request.user_id, [item], top_k=1
                )
                scores['collaborative'] = collab_recs[0][1] if collab_recs else 0.5
                
                # Preference learning score
                predicted_rating = await self.preference_service.predict_user_rating(
                    request.user_id, item, request.preferences
                )
                scores['preference_learning'] = (predicted_rating - 1) / 4  # Normalize to 0-1
                
                # Combine scores
                final_score = sum(
                    scores.get(approach, 0.5) * weight
                    for approach, weight in self.algorithm_weights.items()
                )
                
                rec_response.personalized_score = final_score
                rec_response.reasoning = await self._generate_reasoning(item, scores, user_profile)
                
                # Add alternatives if requested
                if request.include_alternatives:
                    rec_response.alternatives = await self._find_alternatives(item, candidate_items)
                
                recommendations.append(rec_response)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating hybrid recommendations: {str(e)}")
            return []
    
    async def _apply_contextual_adjustments(
        self,
        recommendations: List[RecommendationResponse],
        contextual_factors: List[ContextualFactor],
        preferences: UserPreferences
    ) -> List[RecommendationResponse]:
        """
        Apply contextual scoring adjustments
        """
        try:
            items = [rec.item for rec in recommendations]
            base_scores = [rec.personalized_score for rec in recommendations]
            
            # Apply contextual scoring
            adjusted_scores = await self.contextual_service.apply_contextual_scoring(
                items, base_scores, contextual_factors, preferences
            )
            
            # Update recommendation scores and add contextual explanations
            for i, rec in enumerate(recommendations):
                original_score = rec.personalized_score
                rec.personalized_score = adjusted_scores[i]
                
                # Add contextual explanations
                score_change = adjusted_scores[i] - original_score
                contextual_explanations = await self.contextual_service.generate_contextual_explanations(
                    rec.item, contextual_factors, score_change
                )
                
                if contextual_explanations:
                    rec.reasoning += " " + " ".join(contextual_explanations)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error applying contextual adjustments: {str(e)}")
            return recommendations
    
    async def _generate_reasoning(
        self,
        item: RecommendationItem,
        scores: Dict[str, float],
        user_profile: UserProfile
    ) -> str:
        """
        Generate explanation for why item was recommended
        """
        try:
            reasons = []
            
            # Content-based reasoning
            if scores.get('content_based', 0) > 0.6:
                matching_interests = set(item.categories).intersection(
                    set(user_profile.preferences.interests)
                )
                if matching_interests:
                    reasons.append(f"Matches your interests in {', '.join(matching_interests)}")
            
            # Collaborative reasoning
            if scores.get('collaborative', 0) > 0.6:
                reasons.append("Popular among users with similar preferences")
            
            # Quality reasoning
            if item.rating >= 4.0:
                reasons.append(f"Highly rated ({item.rating}/5.0)")
            
            # Authenticity reasoning
            if item.local_authenticity_score >= 0.8:
                reasons.append("Authentic local experience")
            
            # Budget reasoning
            budget_ranges = {
                'low': (0, 100),
                'medium': (0, 300),
                'high': (0, 800),
                'luxury': (0, float('inf'))
            }
            budget_range = budget_ranges.get(user_profile.preferences.budget_range.value)
            if budget_range and budget_range[0] <= item.estimated_cost <= budget_range[1]:
                reasons.append("Fits your budget preferences")
            
            return ". ".join(reasons) if reasons else "Recommended based on your profile"
            
        except Exception as e:
            logger.error(f"Error generating reasoning: {str(e)}")
            return "Personalized recommendation"
    
    async def _find_alternatives(
        self,
        item: RecommendationItem,
        candidate_items: List[RecommendationItem]
    ) -> List[RecommendationItem]:
        """
        Find alternative items similar to the given item
        """
        try:
            # Find similar items using content-based similarity
            similar_items = await self.content_service.get_item_similarities(item.id, top_k=3)
            
            alternatives = []
            for similar_item_id, similarity in similar_items:
                similar_item = next(
                    (i for i in candidate_items if i.id == similar_item_id), None
                )
                if similar_item and similarity > 0.5:
                    alternatives.append(similar_item)
            
            return alternatives[:2]  # Return top 2 alternatives
            
        except Exception as e:
            logger.error(f"Error finding alternatives: {str(e)}")
            return []
    
    async def _store_recommendations(
        self,
        user_id: str,
        recommendations: List[RecommendationResponse]
    ):
        """
        Store recommendations for feedback processing
        """
        try:
            if user_id not in self.recommendation_history:
                self.recommendation_history[user_id] = []
            
            self.recommendation_history[user_id].extend(recommendations)
            
            # Keep only recent recommendations (last 100)
            self.recommendation_history[user_id] = self.recommendation_history[user_id][-100:]
            
        except Exception as e:
            logger.error(f"Error storing recommendations: {str(e)}")
    
    async def process_feedback(
        self,
        user_id: str,
        recommendation_id: str,
        rating: float,
        feedback: Optional[str] = None
    ):
        """
        Process user feedback to improve future recommendations
        """
        try:
            # Find the recommendation
            user_recs = self.recommendation_history.get(user_id, [])
            recommendation = next(
                (rec for rec in user_recs if rec.id == recommendation_id), None
            )
            
            if not recommendation:
                logger.warning(f"Recommendation {recommendation_id} not found for user {user_id}")
                return
            
            # Update preference learning
            await self.preference_service.update_preferences_from_feedback(
                user_id, recommendation_id, rating, feedback, recommendation.item
            )
            
            # Create interaction record
            interaction = UserInteraction(
                user_id=user_id,
                item_id=recommendation.item.id,
                interaction_type='rate',
                rating=rating,
                timestamp=datetime.now(),
                context={'recommendation_id': recommendation_id}
            )
            
            # Update user profile
            if user_id in self.user_profiles:
                self.user_profiles[user_id].interaction_history.append(interaction)
            
            # Update collaborative filtering
            await self.collaborative_service.update_user_interactions(user_id, [interaction])
            
        except Exception as e:
            logger.error(f"Error processing feedback: {str(e)}")
            raise
    
    async def get_user_recommendations(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[RecommendationResponse]:
        """
        Get recent recommendations for a user
        """
        try:
            user_recs = self.recommendation_history.get(user_id, [])
            
            # Filter active recommendations
            now = datetime.now()
            active_recs = [
                rec for rec in user_recs 
                if rec.valid_until > now
            ]
            
            # Sort by generation time (most recent first)
            active_recs.sort(key=lambda x: x.generated_at, reverse=True)
            
            return active_recs[:limit]
            
        except Exception as e:
            logger.error(f"Error getting user recommendations: {str(e)}")
            return []
    
    async def update_user_preferences(
        self,
        user_id: str,
        preferences: dict
    ):
        """
        Update user preferences and retrain personalization
        """
        try:
            if user_id in self.user_profiles:
                # Update preferences
                profile = self.user_profiles[user_id]
                
                # Convert dict to UserPreferences object
                from ..models.recommendation import UserPreferences, BudgetRange, GroupType, ActivityLevel
                
                user_prefs = UserPreferences(
                    interests=preferences.get('interests', []),
                    budget_range=BudgetRange(preferences.get('budget_range', 'medium')),
                    group_type=GroupType(preferences.get('group_type', 'solo')),
                    dietary_restrictions=preferences.get('dietary_restrictions', []),
                    activity_level=ActivityLevel(preferences.get('activity_level', 'moderate')),
                    weather_preferences=preferences.get('weather_preferences', [])
                )
                
                profile.preferences = user_prefs
                profile.last_updated = datetime.now()
                
                # Retrain preference learning
                await self.preference_service.learn_from_interactions(
                    user_id, profile.interaction_history, self.available_items
                )
            
        except Exception as e:
            logger.error(f"Error updating user preferences: {str(e)}")
            raise
    
    def get_recommendation_stats(self) -> Dict[str, any]:
        """
        Get recommendation engine statistics
        """
        try:
            total_users = len(self.user_profiles)
            total_recommendations = sum(
                len(recs) for recs in self.recommendation_history.values()
            )
            total_interactions = sum(
                len(profile.interaction_history) 
                for profile in self.user_profiles.values()
            )
            
            return {
                'total_users': total_users,
                'total_recommendations': total_recommendations,
                'total_interactions': total_interactions,
                'available_items': len(self.available_items),
                'algorithm_weights': self.algorithm_weights
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendation stats: {str(e)}")
            return {}