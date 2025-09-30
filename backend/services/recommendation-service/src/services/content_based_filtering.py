"""
Content-Based Filtering Service for interest matching recommendations
"""
import numpy as np
from typing import Dict, List, Tuple, Set
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import logging

from ..models.recommendation import UserPreferences, RecommendationItem, UserProfile

logger = logging.getLogger(__name__)

class ContentBasedFilteringService:
    """
    Implements content-based filtering for recommendations based on item features
    and user preferences matching
    """
    
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        self.scaler = StandardScaler()
        self.item_features = {}
        self.item_vectors = None
        self.feature_names = []
        
    async def build_item_features(self, items: List[RecommendationItem]) -> Dict[str, np.ndarray]:
        """
        Build feature vectors for all items
        """
        try:
            if not items:
                return {}
            
            # Extract text features
            text_features = []
            item_ids = []
            
            for item in items:
                # Combine text features
                text_content = f"{item.name} {item.description} {' '.join(item.categories)}"
                text_features.append(text_content)
                item_ids.append(item.id)
            
            # Create TF-IDF vectors
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(text_features)
            
            # Extract numerical features
            numerical_features = []
            for item in items:
                features = [
                    item.rating,
                    item.estimated_duration / 60.0,  # Convert to hours
                    np.log1p(item.estimated_cost),  # Log transform cost
                    float(item.weather_dependent),
                    self._encode_crowd_level(item.crowd_level),
                    item.local_authenticity_score
                ]
                numerical_features.append(features)
            
            numerical_matrix = np.array(numerical_features)
            numerical_matrix = self.scaler.fit_transform(numerical_matrix)
            
            # Combine text and numerical features
            combined_features = np.hstack([tfidf_matrix.toarray(), numerical_matrix])
            
            # Store features
            self.item_features = {}
            for i, item_id in enumerate(item_ids):
                self.item_features[item_id] = combined_features[i]
            
            self.item_vectors = combined_features
            self.feature_names = (
                list(self.tfidf_vectorizer.get_feature_names_out()) +
                ['rating', 'duration', 'cost', 'weather_dependent', 'crowd_level', 'authenticity']
            )
            
            return self.item_features
            
        except Exception as e:
            logger.error(f"Error building item features: {str(e)}")
            raise
    
    def _encode_crowd_level(self, crowd_level: str) -> float:
        """
        Encode crowd level as numerical value
        """
        crowd_mapping = {
            'very_low': 0.0,
            'low': 0.25,
            'moderate': 0.5,
            'high': 0.75,
            'very_high': 1.0
        }
        return crowd_mapping.get(crowd_level, 0.5)
    
    async def build_user_profile_vector(self, user_profile: UserProfile, items: List[RecommendationItem]) -> np.ndarray:
        """
        Build user profile vector based on preferences and interaction history
        """
        try:
            if not self.item_features:
                await self.build_item_features(items)
            
            feature_dim = len(next(iter(self.item_features.values())))
            user_vector = np.zeros(feature_dim)
            
            # Weight based on explicit preferences
            preference_weight = 0.3
            user_vector += self._encode_preferences(user_profile.preferences) * preference_weight
            
            # Weight based on interaction history
            interaction_weight = 0.7
            if user_profile.interaction_history:
                interaction_vector = self._encode_interactions(user_profile.interaction_history)
                user_vector += interaction_vector * interaction_weight
            
            return user_vector
            
        except Exception as e:
            logger.error(f"Error building user profile vector: {str(e)}")
            return np.zeros(len(self.feature_names))
    
    def _encode_preferences(self, preferences: UserPreferences) -> np.ndarray:
        """
        Encode user preferences as feature vector
        """
        try:
            feature_dim = len(self.feature_names)
            pref_vector = np.zeros(feature_dim)
            
            # Encode interests using TF-IDF features
            if preferences.interests:
                interest_text = ' '.join(preferences.interests)
                try:
                    interest_tfidf = self.tfidf_vectorizer.transform([interest_text])
                    tfidf_dim = interest_tfidf.shape[1]
                    pref_vector[:tfidf_dim] = interest_tfidf.toarray()[0]
                except:
                    pass  # Handle case where vectorizer hasn't been fitted
            
            # Encode other preferences in numerical features section
            numerical_start = len(self.tfidf_vectorizer.get_feature_names_out()) if hasattr(self.tfidf_vectorizer, 'vocabulary_') else 0
            
            if numerical_start < feature_dim:
                # Budget preference (affects cost sensitivity)
                budget_mapping = {'low': 0.2, 'medium': 0.5, 'high': 0.8, 'luxury': 1.0}
                budget_score = budget_mapping.get(preferences.budget_range.value, 0.5)
                
                # Activity level preference
                activity_mapping = {'low': 0.2, 'moderate': 0.5, 'high': 0.8, 'extreme': 1.0}
                activity_score = activity_mapping.get(preferences.activity_level.value, 0.5)
                
                # Apply to relevant features
                if numerical_start + 2 < feature_dim:  # cost feature
                    pref_vector[numerical_start + 2] = 1.0 - budget_score  # Lower cost preference for lower budget
                if numerical_start + 1 < feature_dim:  # duration feature
                    pref_vector[numerical_start + 1] = activity_score
            
            return pref_vector
            
        except Exception as e:
            logger.error(f"Error encoding preferences: {str(e)}")
            return np.zeros(len(self.feature_names))
    
    def _encode_interactions(self, interactions: List) -> np.ndarray:
        """
        Encode user interaction history as feature vector
        """
        try:
            feature_dim = len(self.feature_names)
            interaction_vector = np.zeros(feature_dim)
            
            total_weight = 0.0
            
            for interaction in interactions:
                if interaction.item_id in self.item_features:
                    item_vector = self.item_features[interaction.item_id]
                    weight = self._get_interaction_weight(interaction)
                    
                    interaction_vector += item_vector * weight
                    total_weight += weight
            
            if total_weight > 0:
                interaction_vector /= total_weight
            
            return interaction_vector
            
        except Exception as e:
            logger.error(f"Error encoding interactions: {str(e)}")
            return np.zeros(len(self.feature_names))
    
    def _get_interaction_weight(self, interaction) -> float:
        """
        Get weight for interaction based on type and rating
        """
        weights = {
            'view': 1.0,
            'like': 2.0,
            'visit': 3.0,
            'rate': 4.0
        }
        
        base_weight = weights.get(interaction.interaction_type, 1.0)
        
        if hasattr(interaction, 'rating') and interaction.rating is not None:
            rating_weight = interaction.rating / 5.0
            return base_weight * rating_weight
        
        return base_weight
    
    async def generate_content_based_recommendations(
        self,
        user_profile: UserProfile,
        available_items: List[RecommendationItem],
        top_k: int = 20
    ) -> List[Tuple[RecommendationItem, float]]:
        """
        Generate recommendations based on content similarity
        """
        try:
            # Build user profile vector
            user_vector = await self.build_user_profile_vector(user_profile, available_items)
            
            # Get items user hasn't interacted with
            interacted_items = {
                interaction.item_id for interaction in user_profile.interaction_history
            }
            
            candidate_items = [
                item for item in available_items 
                if item.id not in interacted_items
            ]
            
            if not candidate_items:
                return []
            
            # Calculate similarities
            recommendations = []
            
            for item in candidate_items:
                if item.id in self.item_features:
                    item_vector = self.item_features[item.id]
                    
                    # Calculate cosine similarity
                    similarity = cosine_similarity(
                        user_vector.reshape(1, -1),
                        item_vector.reshape(1, -1)
                    )[0, 0]
                    
                    # Apply preference-based boosting
                    boosted_score = self._apply_preference_boosting(
                        item, user_profile.preferences, similarity
                    )
                    
                    recommendations.append((item, boosted_score))
            
            # Sort by score and return top-k
            recommendations.sort(key=lambda x: x[1], reverse=True)
            return recommendations[:top_k]
            
        except Exception as e:
            logger.error(f"Error generating content-based recommendations: {str(e)}")
            return []
    
    def _apply_preference_boosting(
        self,
        item: RecommendationItem,
        preferences: UserPreferences,
        base_score: float
    ) -> float:
        """
        Apply preference-based boosting to recommendation score
        """
        try:
            boost_factor = 1.0
            
            # Interest matching boost
            item_categories = set(cat.lower() for cat in item.categories)
            user_interests = set(interest.lower() for interest in preferences.interests)
            
            if item_categories.intersection(user_interests):
                boost_factor *= 1.2
            
            # Budget compatibility
            budget_ranges = {
                'low': (0, 100),
                'medium': (50, 300),
                'high': (200, 800),
                'luxury': (500, float('inf'))
            }
            
            budget_range = budget_ranges.get(preferences.budget_range.value, (0, float('inf')))
            if budget_range[0] <= item.estimated_cost <= budget_range[1]:
                boost_factor *= 1.1
            elif item.estimated_cost > budget_range[1]:
                boost_factor *= 0.8
            
            # Group type compatibility
            if preferences.group_type.value == 'family' and 'family-friendly' in item_categories:
                boost_factor *= 1.15
            elif preferences.group_type.value == 'couple' and 'romantic' in item_categories:
                boost_factor *= 1.15
            
            # Activity level matching
            activity_duration_mapping = {
                'low': 120,      # 2 hours
                'moderate': 240,  # 4 hours
                'high': 480,     # 8 hours
                'extreme': 720   # 12+ hours
            }
            
            preferred_duration = activity_duration_mapping.get(preferences.activity_level.value, 240)
            duration_diff = abs(item.estimated_duration - preferred_duration) / preferred_duration
            
            if duration_diff < 0.3:  # Within 30% of preferred duration
                boost_factor *= 1.1
            elif duration_diff > 0.7:  # More than 70% different
                boost_factor *= 0.9
            
            return base_score * boost_factor
            
        except Exception as e:
            logger.error(f"Error applying preference boosting: {str(e)}")
            return base_score
    
    async def get_item_similarities(self, item_id: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """
        Find items similar to the given item
        """
        try:
            if item_id not in self.item_features:
                return []
            
            item_vector = self.item_features[item_id]
            similarities = []
            
            for other_item_id, other_vector in self.item_features.items():
                if other_item_id != item_id:
                    similarity = cosine_similarity(
                        item_vector.reshape(1, -1),
                        other_vector.reshape(1, -1)
                    )[0, 0]
                    similarities.append((other_item_id, similarity))
            
            similarities.sort(key=lambda x: x[1], reverse=True)
            return similarities[:top_k]
            
        except Exception as e:
            logger.error(f"Error getting item similarities: {str(e)}")
            return []
    
    def get_feature_importance(self, user_profile: UserProfile, items: List[RecommendationItem]) -> Dict[str, float]:
        """
        Get feature importance for user's preferences
        """
        try:
            user_vector = self.build_user_profile_vector(user_profile, items)
            
            # Calculate feature importance based on vector magnitudes
            feature_importance = {}
            
            for i, feature_name in enumerate(self.feature_names):
                if i < len(user_vector):
                    feature_importance[feature_name] = abs(user_vector[i])
            
            # Normalize to sum to 1
            total_importance = sum(feature_importance.values())
            if total_importance > 0:
                feature_importance = {
                    k: v / total_importance 
                    for k, v in feature_importance.items()
                }
            
            return feature_importance
            
        except Exception as e:
            logger.error(f"Error getting feature importance: {str(e)}")
            return {}