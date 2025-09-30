"""
Preference Learning Service that adapts to user behavior over time
"""
import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from datetime import datetime, timedelta
import logging

from ..models.recommendation import (
    UserProfile, UserInteraction, UserPreferences, 
    RecommendationItem, RecommendationResponse
)

logger = logging.getLogger(__name__)

class PreferenceLearningService:
    """
    Learns and adapts user preferences based on interaction patterns and feedback
    """
    
    def __init__(self, learning_rate: float = 0.1, decay_factor: float = 0.95):
        self.learning_rate = learning_rate
        self.decay_factor = decay_factor
        self.user_learned_preferences = {}
        self.interaction_weights = {
            'view': 0.1,
            'like': 0.3,
            'visit': 0.7,
            'rate': 1.0,
            'share': 0.4,
            'save': 0.5
        }
        
    async def learn_from_interactions(
        self, 
        user_id: str, 
        interactions: List[UserInteraction],
        items: List[RecommendationItem]
    ) -> Dict[str, float]:
        """
        Learn user preferences from interaction history
        """
        try:
            if user_id not in self.user_learned_preferences:
                self.user_learned_preferences[user_id] = defaultdict(float)
            
            learned_prefs = self.user_learned_preferences[user_id]
            
            # Create item lookup
            item_lookup = {item.id: item for item in items}
            
            # Process interactions
            for interaction in interactions:
                if interaction.item_id not in item_lookup:
                    continue
                
                item = item_lookup[interaction.item_id]
                weight = self._get_interaction_weight(interaction)
                
                # Learn from categories
                for category in item.categories:
                    category_key = f"category_{category.lower()}"
                    learned_prefs[category_key] += weight * self.learning_rate
                
                # Learn from item attributes
                self._learn_from_item_attributes(learned_prefs, item, weight)
                
                # Learn from contextual factors
                if hasattr(interaction, 'context') and interaction.context:
                    self._learn_from_context(learned_prefs, interaction.context, weight)
            
            # Apply temporal decay to older preferences
            await self._apply_temporal_decay(user_id, interactions)
            
            return dict(learned_prefs)
            
        except Exception as e:
            logger.error(f"Error learning from interactions: {str(e)}")
            return {}
    
    def _get_interaction_weight(self, interaction: UserInteraction) -> float:
        """
        Calculate weight for interaction based on type and rating
        """
        base_weight = self.interaction_weights.get(interaction.interaction_type, 0.1)
        
        # Apply rating multiplier if available
        if interaction.rating is not None:
            rating_multiplier = interaction.rating / 5.0  # Normalize to 0-1
            return base_weight * rating_multiplier
        
        return base_weight
    
    def _learn_from_item_attributes(
        self, 
        learned_prefs: Dict[str, float], 
        item: RecommendationItem, 
        weight: float
    ):
        """
        Learn preferences from item attributes
        """
        try:
            # Learn from price range
            if item.estimated_cost < 100:
                learned_prefs['budget_low'] += weight * self.learning_rate
            elif item.estimated_cost < 300:
                learned_prefs['budget_medium'] += weight * self.learning_rate
            elif item.estimated_cost < 800:
                learned_prefs['budget_high'] += weight * self.learning_rate
            else:
                learned_prefs['budget_luxury'] += weight * self.learning_rate
            
            # Learn from duration preferences
            if item.estimated_duration < 120:  # < 2 hours
                learned_prefs['duration_short'] += weight * self.learning_rate
            elif item.estimated_duration < 240:  # 2-4 hours
                learned_prefs['duration_medium'] += weight * self.learning_rate
            else:  # > 4 hours
                learned_prefs['duration_long'] += weight * self.learning_rate
            
            # Learn from rating preferences
            if item.rating >= 4.5:
                learned_prefs['quality_high'] += weight * self.learning_rate
            elif item.rating >= 3.5:
                learned_prefs['quality_medium'] += weight * self.learning_rate
            else:
                learned_prefs['quality_low'] += weight * self.learning_rate
            
            # Learn from authenticity preferences
            if item.local_authenticity_score >= 0.8:
                learned_prefs['authenticity_high'] += weight * self.learning_rate
            elif item.local_authenticity_score >= 0.5:
                learned_prefs['authenticity_medium'] += weight * self.learning_rate
            else:
                learned_prefs['authenticity_low'] += weight * self.learning_rate
            
            # Learn from crowd preferences
            crowd_pref_key = f"crowd_{item.crowd_level}"
            learned_prefs[crowd_pref_key] += weight * self.learning_rate
            
        except Exception as e:
            logger.error(f"Error learning from item attributes: {str(e)}")
    
    def _learn_from_context(
        self, 
        learned_prefs: Dict[str, float], 
        context: Dict, 
        weight: float
    ):
        """
        Learn preferences from contextual information
        """
        try:
            # Learn weather preferences
            if 'weather' in context:
                weather = context['weather']
                weather_key = f"weather_{weather.lower()}"
                learned_prefs[weather_key] += weight * self.learning_rate
            
            # Learn time preferences
            if 'time_of_day' in context:
                time_period = context['time_of_day']
                time_key = f"time_{time_period.lower()}"
                learned_prefs[time_key] += weight * self.learning_rate
            
            # Learn location preferences
            if 'district' in context:
                district = context['district']
                district_key = f"district_{district.lower()}"
                learned_prefs[district_key] += weight * self.learning_rate
            
        except Exception as e:
            logger.error(f"Error learning from context: {str(e)}")
    
    async def _apply_temporal_decay(self, user_id: str, interactions: List[UserInteraction]):
        """
        Apply temporal decay to older preferences
        """
        try:
            if not interactions:
                return
            
            # Find the most recent interaction
            most_recent = max(interactions, key=lambda x: x.timestamp)
            cutoff_date = most_recent.timestamp - timedelta(days=30)  # 30-day decay window
            
            learned_prefs = self.user_learned_preferences[user_id]
            
            # Apply decay to all preferences
            for key in learned_prefs:
                learned_prefs[key] *= self.decay_factor
                
                # Remove very small preferences to prevent noise
                if learned_prefs[key] < 0.01:
                    learned_prefs[key] = 0.0
            
        except Exception as e:
            logger.error(f"Error applying temporal decay: {str(e)}")
    
    async def update_preferences_from_feedback(
        self,
        user_id: str,
        recommendation_id: str,
        rating: float,
        feedback: Optional[str],
        recommended_item: RecommendationItem
    ):
        """
        Update learned preferences based on explicit feedback
        """
        try:
            if user_id not in self.user_learned_preferences:
                self.user_learned_preferences[user_id] = defaultdict(float)
            
            learned_prefs = self.user_learned_preferences[user_id]
            
            # Convert rating to weight (1-5 scale to -1 to 1 scale)
            feedback_weight = (rating - 3.0) / 2.0  # Maps 1->-1, 3->0, 5->1
            
            # Update category preferences
            for category in recommended_item.categories:
                category_key = f"category_{category.lower()}"
                learned_prefs[category_key] += feedback_weight * self.learning_rate
            
            # Update attribute preferences
            self._update_attribute_preferences(learned_prefs, recommended_item, feedback_weight)
            
            # Process text feedback if available
            if feedback:
                await self._process_text_feedback(learned_prefs, feedback, feedback_weight)
            
        except Exception as e:
            logger.error(f"Error updating preferences from feedback: {str(e)}")
    
    def _update_attribute_preferences(
        self,
        learned_prefs: Dict[str, float],
        item: RecommendationItem,
        feedback_weight: float
    ):
        """
        Update attribute preferences based on feedback
        """
        try:
            # Update budget preferences
            if item.estimated_cost < 100:
                learned_prefs['budget_low'] += feedback_weight * self.learning_rate
            elif item.estimated_cost < 300:
                learned_prefs['budget_medium'] += feedback_weight * self.learning_rate
            elif item.estimated_cost < 800:
                learned_prefs['budget_high'] += feedback_weight * self.learning_rate
            else:
                learned_prefs['budget_luxury'] += feedback_weight * self.learning_rate
            
            # Update duration preferences
            if item.estimated_duration < 120:
                learned_prefs['duration_short'] += feedback_weight * self.learning_rate
            elif item.estimated_duration < 240:
                learned_prefs['duration_medium'] += feedback_weight * self.learning_rate
            else:
                learned_prefs['duration_long'] += feedback_weight * self.learning_rate
            
            # Update crowd preferences
            crowd_key = f"crowd_{item.crowd_level}"
            learned_prefs[crowd_key] += feedback_weight * self.learning_rate
            
        except Exception as e:
            logger.error(f"Error updating attribute preferences: {str(e)}")
    
    async def _process_text_feedback(
        self,
        learned_prefs: Dict[str, float],
        feedback: str,
        feedback_weight: float
    ):
        """
        Process text feedback to extract preference signals
        """
        try:
            feedback_lower = feedback.lower()
            
            # Positive keywords
            positive_keywords = {
                'authentic': 'authenticity_high',
                'local': 'authenticity_high',
                'quiet': 'crowd_low',
                'peaceful': 'crowd_low',
                'affordable': 'budget_low',
                'cheap': 'budget_low',
                'quick': 'duration_short',
                'fast': 'duration_short',
                'beautiful': 'quality_high',
                'amazing': 'quality_high',
                'excellent': 'quality_high'
            }
            
            # Negative keywords
            negative_keywords = {
                'crowded': 'crowd_high',
                'busy': 'crowd_high',
                'expensive': 'budget_high',
                'costly': 'budget_high',
                'long': 'duration_long',
                'slow': 'duration_long',
                'touristy': 'authenticity_low',
                'fake': 'authenticity_low',
                'poor': 'quality_low',
                'bad': 'quality_low'
            }
            
            # Process positive keywords
            for keyword, pref_key in positive_keywords.items():
                if keyword in feedback_lower:
                    learned_prefs[pref_key] += abs(feedback_weight) * self.learning_rate
            
            # Process negative keywords
            for keyword, pref_key in negative_keywords.items():
                if keyword in feedback_lower:
                    learned_prefs[pref_key] -= abs(feedback_weight) * self.learning_rate
            
        except Exception as e:
            logger.error(f"Error processing text feedback: {str(e)}")
    
    async def get_learned_preferences(self, user_id: str) -> Dict[str, float]:
        """
        Get learned preferences for a user
        """
        try:
            if user_id not in self.user_learned_preferences:
                return {}
            
            # Return normalized preferences
            prefs = dict(self.user_learned_preferences[user_id])
            
            # Normalize to prevent extreme values
            max_val = max(abs(v) for v in prefs.values()) if prefs else 1.0
            if max_val > 1.0:
                prefs = {k: v / max_val for k, v in prefs.items()}
            
            return prefs
            
        except Exception as e:
            logger.error(f"Error getting learned preferences: {str(e)}")
            return {}
    
    async def merge_explicit_and_learned_preferences(
        self,
        explicit_prefs: UserPreferences,
        learned_prefs: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Merge explicit user preferences with learned preferences
        """
        try:
            merged_prefs = {}
            
            # Start with learned preferences
            merged_prefs.update(learned_prefs)
            
            # Add explicit preferences with higher weight
            explicit_weight = 1.5
            
            # Process explicit interests
            for interest in explicit_prefs.interests:
                interest_key = f"category_{interest.lower()}"
                merged_prefs[interest_key] = merged_prefs.get(interest_key, 0) + explicit_weight
            
            # Process explicit budget preference
            budget_key = f"budget_{explicit_prefs.budget_range.value}"
            merged_prefs[budget_key] = merged_prefs.get(budget_key, 0) + explicit_weight
            
            # Process explicit activity level
            activity_mapping = {
                'low': 'duration_short',
                'moderate': 'duration_medium',
                'high': 'duration_long',
                'extreme': 'duration_long'
            }
            activity_key = activity_mapping.get(explicit_prefs.activity_level.value)
            if activity_key:
                merged_prefs[activity_key] = merged_prefs.get(activity_key, 0) + explicit_weight
            
            return merged_prefs
            
        except Exception as e:
            logger.error(f"Error merging preferences: {str(e)}")
            return learned_prefs
    
    async def predict_user_rating(
        self,
        user_id: str,
        item: RecommendationItem,
        explicit_prefs: UserPreferences
    ) -> float:
        """
        Predict user rating for an item based on learned preferences
        """
        try:
            learned_prefs = await self.get_learned_preferences(user_id)
            merged_prefs = await self.merge_explicit_and_learned_preferences(
                explicit_prefs, learned_prefs
            )
            
            if not merged_prefs:
                return 3.0  # Default neutral rating
            
            predicted_score = 3.0  # Start with neutral
            total_weight = 0.0
            
            # Check category preferences
            for category in item.categories:
                category_key = f"category_{category.lower()}"
                if category_key in merged_prefs:
                    predicted_score += merged_prefs[category_key]
                    total_weight += abs(merged_prefs[category_key])
            
            # Check attribute preferences
            attribute_scores = []
            
            # Budget preference
            if item.estimated_cost < 100 and 'budget_low' in merged_prefs:
                attribute_scores.append(merged_prefs['budget_low'])
            elif item.estimated_cost < 300 and 'budget_medium' in merged_prefs:
                attribute_scores.append(merged_prefs['budget_medium'])
            elif item.estimated_cost < 800 and 'budget_high' in merged_prefs:
                attribute_scores.append(merged_prefs['budget_high'])
            elif 'budget_luxury' in merged_prefs:
                attribute_scores.append(merged_prefs['budget_luxury'])
            
            # Duration preference
            if item.estimated_duration < 120 and 'duration_short' in merged_prefs:
                attribute_scores.append(merged_prefs['duration_short'])
            elif item.estimated_duration < 240 and 'duration_medium' in merged_prefs:
                attribute_scores.append(merged_prefs['duration_medium'])
            elif 'duration_long' in merged_prefs:
                attribute_scores.append(merged_prefs['duration_long'])
            
            # Crowd preference
            crowd_key = f"crowd_{item.crowd_level}"
            if crowd_key in merged_prefs:
                attribute_scores.append(merged_prefs[crowd_key])
            
            # Average attribute scores
            if attribute_scores:
                predicted_score += np.mean(attribute_scores)
                total_weight += 1.0
            
            # Normalize and clamp to 1-5 range
            if total_weight > 0:
                predicted_score = max(1.0, min(5.0, predicted_score))
            else:
                predicted_score = 3.0
            
            return predicted_score
            
        except Exception as e:
            logger.error(f"Error predicting user rating: {str(e)}")
            return 3.0
    
    def get_preference_insights(self, user_id: str) -> Dict[str, any]:
        """
        Get insights about user's learned preferences
        """
        try:
            if user_id not in self.user_learned_preferences:
                return {}
            
            prefs = self.user_learned_preferences[user_id]
            
            # Find top preferences
            sorted_prefs = sorted(prefs.items(), key=lambda x: abs(x[1]), reverse=True)
            top_preferences = sorted_prefs[:10]
            
            # Categorize preferences
            categories = defaultdict(list)
            for pref_key, value in top_preferences:
                if pref_key.startswith('category_'):
                    categories['interests'].append((pref_key[9:], value))
                elif pref_key.startswith('budget_'):
                    categories['budget'].append((pref_key[7:], value))
                elif pref_key.startswith('duration_'):
                    categories['duration'].append((pref_key[9:], value))
                elif pref_key.startswith('crowd_'):
                    categories['crowd'].append((pref_key[6:], value))
                elif pref_key.startswith('weather_'):
                    categories['weather'].append((pref_key[8:], value))
            
            return {
                'top_preferences': top_preferences,
                'categorized_preferences': dict(categories),
                'total_preferences': len(prefs),
                'learning_strength': sum(abs(v) for v in prefs.values())
            }
            
        except Exception as e:
            logger.error(f"Error getting preference insights: {str(e)}")
            return {}