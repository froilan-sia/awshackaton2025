"""
Collaborative Filtering Service for user similarity-based recommendations
"""
import numpy as np
from typing import Dict, List, Tuple, Optional
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
import logging

from ..models.recommendation import UserProfile, UserInteraction, RecommendationItem

logger = logging.getLogger(__name__)

class CollaborativeFilteringService:
    """
    Implements collaborative filtering algorithm for finding similar users
    and generating recommendations based on user behavior patterns
    """
    
    def __init__(self, n_components: int = 50, min_interactions: int = 5):
        self.n_components = n_components
        self.min_interactions = min_interactions
        self.svd_model = TruncatedSVD(n_components=n_components, random_state=42)
        self.user_item_matrix = None
        self.user_similarities = {}
        self.item_features = {}
        self.user_profiles = {}
        
    async def build_user_item_matrix(self, user_profiles: List[UserProfile]) -> np.ndarray:
        """
        Build user-item interaction matrix from user profiles
        """
        try:
            # Extract all unique items
            all_items = set()
            for profile in user_profiles:
                for interaction in profile.interaction_history:
                    all_items.add(interaction.item_id)
            
            item_list = list(all_items)
            user_list = [profile.user_id for profile in user_profiles]
            
            # Create matrix
            matrix = np.zeros((len(user_list), len(item_list)))
            
            for i, profile in enumerate(user_profiles):
                self.user_profiles[profile.user_id] = profile
                for interaction in profile.interaction_history:
                    if interaction.item_id in item_list:
                        j = item_list.index(interaction.item_id)
                        # Weight interactions by type and rating
                        weight = self._get_interaction_weight(interaction)
                        matrix[i, j] = weight
            
            self.user_item_matrix = matrix
            self.item_list = item_list
            self.user_list = user_list
            
            return matrix
            
        except Exception as e:
            logger.error(f"Error building user-item matrix: {str(e)}")
            raise
    
    def _get_interaction_weight(self, interaction: UserInteraction) -> float:
        """
        Calculate weight for different interaction types
        """
        weights = {
            'view': 1.0,
            'like': 2.0,
            'visit': 3.0,
            'rate': 4.0
        }
        
        base_weight = weights.get(interaction.interaction_type, 1.0)
        
        # Apply rating if available
        if interaction.rating is not None:
            rating_weight = interaction.rating / 5.0  # Normalize to 0-1
            return base_weight * rating_weight
        
        return base_weight
    
    async def compute_user_similarities(self) -> Dict[str, Dict[str, float]]:
        """
        Compute user-user similarities using cosine similarity
        """
        try:
            if self.user_item_matrix is None:
                raise ValueError("User-item matrix not built yet")
            
            # Apply SVD for dimensionality reduction
            if self.user_item_matrix.shape[1] > self.n_components:
                reduced_matrix = self.svd_model.fit_transform(self.user_item_matrix)
            else:
                reduced_matrix = self.user_item_matrix
            
            # Compute cosine similarities
            similarities = cosine_similarity(reduced_matrix)
            
            # Store similarities in dictionary format
            self.user_similarities = {}
            for i, user_id in enumerate(self.user_list):
                self.user_similarities[user_id] = {}
                for j, other_user_id in enumerate(self.user_list):
                    if i != j:
                        self.user_similarities[user_id][other_user_id] = similarities[i, j]
            
            return self.user_similarities
            
        except Exception as e:
            logger.error(f"Error computing user similarities: {str(e)}")
            raise
    
    async def find_similar_users(self, user_id: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """
        Find top-k most similar users to the given user
        """
        try:
            if user_id not in self.user_similarities:
                return []
            
            similarities = self.user_similarities[user_id]
            
            # Sort by similarity score and return top-k
            sorted_users = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
            return sorted_users[:top_k]
            
        except Exception as e:
            logger.error(f"Error finding similar users: {str(e)}")
            return []
    
    async def generate_collaborative_recommendations(
        self, 
        user_id: str, 
        available_items: List[RecommendationItem],
        top_k: int = 20
    ) -> List[Tuple[RecommendationItem, float]]:
        """
        Generate recommendations based on similar users' preferences
        """
        try:
            # Find similar users
            similar_users = await self.find_similar_users(user_id, top_k=10)
            
            if not similar_users:
                return []
            
            # Get user's interaction history
            user_profile = self.user_profiles.get(user_id)
            if not user_profile:
                return []
            
            user_interacted_items = {
                interaction.item_id for interaction in user_profile.interaction_history
            }
            
            # Score items based on similar users' interactions
            item_scores = {}
            
            for item in available_items:
                if item.id in user_interacted_items:
                    continue  # Skip items user has already interacted with
                
                score = 0.0
                total_weight = 0.0
                
                for similar_user_id, similarity in similar_users:
                    similar_profile = self.user_profiles.get(similar_user_id)
                    if not similar_profile:
                        continue
                    
                    # Check if similar user interacted with this item
                    for interaction in similar_profile.interaction_history:
                        if interaction.item_id == item.id:
                            interaction_weight = self._get_interaction_weight(interaction)
                            score += similarity * interaction_weight
                            total_weight += similarity
                            break
                
                if total_weight > 0:
                    item_scores[item.id] = score / total_weight
            
            # Sort items by score and return recommendations
            sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
            
            recommendations = []
            for item_id, score in sorted_items[:top_k]:
                item = next((item for item in available_items if item.id == item_id), None)
                if item:
                    recommendations.append((item, score))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating collaborative recommendations: {str(e)}")
            return []
    
    async def update_user_interactions(self, user_id: str, interactions: List[UserInteraction]):
        """
        Update user interactions and recompute similarities if needed
        """
        try:
            if user_id in self.user_profiles:
                self.user_profiles[user_id].interaction_history.extend(interactions)
            else:
                # Create new user profile
                from ..models.recommendation import UserPreferences
                self.user_profiles[user_id] = UserProfile(
                    user_id=user_id,
                    preferences=UserPreferences(),
                    interaction_history=interactions
                )
            
            # Trigger recomputation if significant changes
            if len(interactions) >= self.min_interactions:
                await self._incremental_update(user_id)
                
        except Exception as e:
            logger.error(f"Error updating user interactions: {str(e)}")
            raise
    
    async def _incremental_update(self, user_id: str):
        """
        Incrementally update similarities for a specific user
        """
        try:
            # For now, we'll do a full recomputation
            # In production, this could be optimized for incremental updates
            if len(self.user_profiles) >= self.min_interactions:
                user_profiles = list(self.user_profiles.values())
                await self.build_user_item_matrix(user_profiles)
                await self.compute_user_similarities()
                
        except Exception as e:
            logger.error(f"Error in incremental update: {str(e)}")
            raise
    
    def get_user_similarity_stats(self, user_id: str) -> Dict[str, float]:
        """
        Get similarity statistics for a user
        """
        try:
            if user_id not in self.user_similarities:
                return {}
            
            similarities = list(self.user_similarities[user_id].values())
            
            if not similarities:
                return {}
            
            return {
                'mean_similarity': np.mean(similarities),
                'max_similarity': np.max(similarities),
                'min_similarity': np.min(similarities),
                'std_similarity': np.std(similarities),
                'num_similar_users': len([s for s in similarities if s > 0.1])
            }
            
        except Exception as e:
            logger.error(f"Error getting similarity stats: {str(e)}")
            return {}