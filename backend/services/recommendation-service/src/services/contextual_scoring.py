"""
Contextual Scoring Service for weather, crowd, and time-based recommendation adjustments
"""
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, time
import logging

from ..models.recommendation import (
    ContextualFactor, RecommendationItem, ContextType, 
    UserPreferences, RecommendationRequest
)

logger = logging.getLogger(__name__)

class ContextualScoringService:
    """
    Applies contextual factors (weather, crowd, time) to recommendation scores
    """
    
    def __init__(self):
        self.weather_impact_weights = {
            'sunny': {'outdoor': 1.2, 'indoor': 0.9},
            'cloudy': {'outdoor': 1.0, 'indoor': 1.0},
            'rainy': {'outdoor': 0.3, 'indoor': 1.3},
            'stormy': {'outdoor': 0.1, 'indoor': 1.4},
            'hot': {'outdoor': 0.8, 'indoor': 1.1},
            'humid': {'outdoor': 0.7, 'indoor': 1.2},
            'cool': {'outdoor': 1.1, 'indoor': 0.95},
            'windy': {'outdoor': 0.9, 'indoor': 1.0}
        }
        
        self.crowd_impact_weights = {
            'very_low': 1.1,
            'low': 1.05,
            'moderate': 1.0,
            'high': 0.8,
            'very_high': 0.5
        }
        
        self.time_preferences = {
            'morning': {'cultural': 1.2, 'outdoor': 1.3, 'shopping': 0.8},
            'afternoon': {'cultural': 1.0, 'outdoor': 1.1, 'shopping': 1.2},
            'evening': {'cultural': 0.9, 'outdoor': 0.8, 'shopping': 1.1, 'dining': 1.3},
            'night': {'cultural': 0.7, 'outdoor': 0.5, 'shopping': 0.6, 'dining': 1.2, 'nightlife': 1.4}
        }
    
    async def apply_contextual_scoring(
        self,
        items: List[RecommendationItem],
        base_scores: List[float],
        contextual_factors: List[ContextualFactor],
        user_preferences: UserPreferences
    ) -> List[float]:
        """
        Apply contextual factors to base recommendation scores
        """
        try:
            if len(items) != len(base_scores):
                raise ValueError("Items and scores lists must have same length")
            
            contextual_scores = base_scores.copy()
            
            for factor in contextual_factors:
                if factor.type == ContextType.WEATHER:
                    contextual_scores = await self._apply_weather_context(
                        items, contextual_scores, factor, user_preferences
                    )
                elif factor.type == ContextType.CROWD:
                    contextual_scores = await self._apply_crowd_context(
                        items, contextual_scores, factor
                    )
                elif factor.type == ContextType.TIME:
                    contextual_scores = await self._apply_time_context(
                        items, contextual_scores, factor
                    )
                elif factor.type == ContextType.LOCATION:
                    contextual_scores = await self._apply_location_context(
                        items, contextual_scores, factor
                    )
                elif factor.type == ContextType.SEASON:
                    contextual_scores = await self._apply_seasonal_context(
                        items, contextual_scores, factor
                    )
            
            return contextual_scores
            
        except Exception as e:
            logger.error(f"Error applying contextual scoring: {str(e)}")
            return base_scores
    
    async def _apply_weather_context(
        self,
        items: List[RecommendationItem],
        scores: List[float],
        weather_factor: ContextualFactor,
        user_preferences: UserPreferences
    ) -> List[float]:
        """
        Apply weather-based scoring adjustments
        """
        try:
            weather_condition = weather_factor.value.get('condition', 'cloudy')
            temperature = weather_factor.value.get('temperature', 25)
            humidity = weather_factor.value.get('humidity', 70)
            
            adjusted_scores = []
            
            for i, (item, score) in enumerate(zip(items, scores)):
                adjustment_factor = 1.0
                
                # Weather dependency adjustment
                if item.weather_dependent:
                    if weather_condition in self.weather_impact_weights:
                        # Determine if item is indoor/outdoor
                        item_type = self._classify_item_environment(item)
                        weather_weights = self.weather_impact_weights[weather_condition]
                        adjustment_factor *= weather_weights.get(item_type, 1.0)
                
                # Temperature-based adjustments
                if temperature > 30:  # Hot weather
                    if 'outdoor' in item.categories or 'hiking' in item.categories:
                        adjustment_factor *= 0.7
                    elif 'indoor' in item.categories or 'mall' in item.categories:
                        adjustment_factor *= 1.2
                elif temperature < 15:  # Cool weather
                    if 'outdoor' in item.categories:
                        adjustment_factor *= 0.9
                    elif 'hot springs' in item.categories or 'indoor' in item.categories:
                        adjustment_factor *= 1.1
                
                # Humidity adjustments
                if humidity > 80:
                    if 'outdoor' in item.categories:
                        adjustment_factor *= 0.8
                    elif 'air-conditioned' in item.categories:
                        adjustment_factor *= 1.1
                
                # User weather preferences
                if 'indoor_preferred' in user_preferences.weather_preferences:
                    if self._classify_item_environment(item) == 'indoor':
                        adjustment_factor *= 1.1
                elif 'outdoor_preferred' in user_preferences.weather_preferences:
                    if self._classify_item_environment(item) == 'outdoor':
                        adjustment_factor *= 1.1
                
                # Apply confidence weighting
                final_adjustment = 1.0 + (adjustment_factor - 1.0) * weather_factor.confidence
                adjusted_scores.append(score * final_adjustment)
            
            return adjusted_scores
            
        except Exception as e:
            logger.error(f"Error applying weather context: {str(e)}")
            return scores
    
    def _classify_item_environment(self, item: RecommendationItem) -> str:
        """
        Classify item as indoor or outdoor based on categories
        """
        outdoor_keywords = ['outdoor', 'hiking', 'beach', 'park', 'garden', 'mountain', 'trail']
        indoor_keywords = ['indoor', 'museum', 'mall', 'restaurant', 'theater', 'gallery']
        
        item_text = f"{item.name} {item.description} {' '.join(item.categories)}".lower()
        
        outdoor_score = sum(1 for keyword in outdoor_keywords if keyword in item_text)
        indoor_score = sum(1 for keyword in indoor_keywords if keyword in item_text)
        
        if outdoor_score > indoor_score:
            return 'outdoor'
        elif indoor_score > outdoor_score:
            return 'indoor'
        else:
            return 'mixed'
    
    async def _apply_crowd_context(
        self,
        items: List[RecommendationItem],
        scores: List[float],
        crowd_factor: ContextualFactor
    ) -> List[float]:
        """
        Apply crowd-based scoring adjustments
        """
        try:
            adjusted_scores = []
            
            for item, score in zip(items, scores):
                adjustment_factor = self.crowd_impact_weights.get(item.crowd_level, 1.0)
                
                # Additional crowd context from factor
                if 'overall_crowd_level' in crowd_factor.value:
                    overall_crowd = crowd_factor.value['overall_crowd_level']
                    if overall_crowd == 'high':
                        # Boost less crowded alternatives
                        if item.crowd_level in ['very_low', 'low']:
                            adjustment_factor *= 1.2
                
                # Apply confidence weighting
                final_adjustment = 1.0 + (adjustment_factor - 1.0) * crowd_factor.confidence
                adjusted_scores.append(score * final_adjustment)
            
            return adjusted_scores
            
        except Exception as e:
            logger.error(f"Error applying crowd context: {str(e)}")
            return scores
    
    async def _apply_time_context(
        self,
        items: List[RecommendationItem],
        scores: List[float],
        time_factor: ContextualFactor
    ) -> List[float]:
        """
        Apply time-based scoring adjustments
        """
        try:
            current_time = time_factor.value.get('current_time')
            if not current_time:
                return scores
            
            # Determine time period
            if isinstance(current_time, str):
                hour = int(current_time.split(':')[0])
            else:
                hour = current_time.hour
            
            time_period = self._get_time_period(hour)
            time_weights = self.time_preferences.get(time_period, {})
            
            adjusted_scores = []
            
            for item, score in zip(items, scores):
                adjustment_factor = 1.0
                
                # Apply time-based category weights
                for category in item.categories:
                    category_lower = category.lower()
                    if category_lower in time_weights:
                        adjustment_factor *= time_weights[category_lower]
                        break
                
                # Special time-based rules
                if time_period == 'morning':
                    if 'breakfast' in item.categories or 'dim sum' in item.categories:
                        adjustment_factor *= 1.3
                elif time_period == 'evening':
                    if 'sunset' in item.categories or 'night view' in item.categories:
                        adjustment_factor *= 1.2
                elif time_period == 'night':
                    if 'night market' in item.categories or 'bar' in item.categories:
                        adjustment_factor *= 1.3
                
                # Apply confidence weighting
                final_adjustment = 1.0 + (adjustment_factor - 1.0) * time_factor.confidence
                adjusted_scores.append(score * final_adjustment)
            
            return adjusted_scores
            
        except Exception as e:
            logger.error(f"Error applying time context: {str(e)}")
            return scores
    
    def _get_time_period(self, hour: int) -> str:
        """
        Determine time period from hour
        """
        if 6 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 18:
            return 'afternoon'
        elif 18 <= hour < 22:
            return 'evening'
        else:
            return 'night'
    
    async def _apply_location_context(
        self,
        items: List[RecommendationItem],
        scores: List[float],
        location_factor: ContextualFactor
    ) -> List[float]:
        """
        Apply location-based scoring adjustments
        """
        try:
            user_location = location_factor.value
            if not user_location or 'latitude' not in user_location:
                return scores
            
            user_lat = user_location['latitude']
            user_lon = user_location['longitude']
            
            adjusted_scores = []
            
            for item, score in zip(items, scores):
                # Calculate distance
                distance = self._calculate_distance(
                    user_lat, user_lon,
                    item.location.latitude, item.location.longitude
                )
                
                # Apply distance-based adjustment
                if distance < 1:  # Within 1km
                    adjustment_factor = 1.2
                elif distance < 5:  # Within 5km
                    adjustment_factor = 1.1
                elif distance < 10:  # Within 10km
                    adjustment_factor = 1.0
                elif distance < 20:  # Within 20km
                    adjustment_factor = 0.9
                else:  # More than 20km
                    adjustment_factor = 0.8
                
                # Apply confidence weighting
                final_adjustment = 1.0 + (adjustment_factor - 1.0) * location_factor.confidence
                adjusted_scores.append(score * final_adjustment)
            
            return adjusted_scores
            
        except Exception as e:
            logger.error(f"Error applying location context: {str(e)}")
            return scores
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points using Haversine formula
        """
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r
    
    async def _apply_seasonal_context(
        self,
        items: List[RecommendationItem],
        scores: List[float],
        season_factor: ContextualFactor
    ) -> List[float]:
        """
        Apply seasonal scoring adjustments
        """
        try:
            season = season_factor.value.get('season', 'spring')
            
            seasonal_weights = {
                'spring': {'outdoor': 1.1, 'flowers': 1.3, 'hiking': 1.2},
                'summer': {'beach': 1.3, 'water': 1.2, 'indoor': 1.1, 'outdoor': 0.9},
                'autumn': {'hiking': 1.2, 'outdoor': 1.1, 'cultural': 1.1},
                'winter': {'indoor': 1.2, 'hot springs': 1.3, 'cultural': 1.1, 'outdoor': 0.8}
            }
            
            season_weights = seasonal_weights.get(season, {})
            adjusted_scores = []
            
            for item, score in zip(items, scores):
                adjustment_factor = 1.0
                
                for category in item.categories:
                    category_lower = category.lower()
                    if category_lower in season_weights:
                        adjustment_factor *= season_weights[category_lower]
                        break
                
                # Apply confidence weighting
                final_adjustment = 1.0 + (adjustment_factor - 1.0) * season_factor.confidence
                adjusted_scores.append(score * final_adjustment)
            
            return adjusted_scores
            
        except Exception as e:
            logger.error(f"Error applying seasonal context: {str(e)}")
            return scores
    
    async def generate_contextual_explanations(
        self,
        item: RecommendationItem,
        contextual_factors: List[ContextualFactor],
        score_change: float
    ) -> List[str]:
        """
        Generate explanations for contextual score adjustments
        """
        try:
            explanations = []
            
            for factor in contextual_factors:
                if factor.type == ContextType.WEATHER:
                    weather_condition = factor.value.get('condition', 'unknown')
                    if score_change > 0.1:
                        explanations.append(f"Great choice for {weather_condition} weather!")
                    elif score_change < -0.1:
                        explanations.append(f"Consider indoor alternatives due to {weather_condition} conditions")
                
                elif factor.type == ContextType.CROWD:
                    if item.crowd_level in ['very_low', 'low'] and score_change > 0:
                        explanations.append("Perfect timing - low crowds expected!")
                    elif item.crowd_level in ['high', 'very_high']:
                        explanations.append("Popular spot - consider visiting during off-peak hours")
                
                elif factor.type == ContextType.TIME:
                    current_time = factor.value.get('current_time')
                    if current_time:
                        hour = int(current_time.split(':')[0]) if isinstance(current_time, str) else current_time.hour
                        time_period = self._get_time_period(hour)
                        if score_change > 0.1:
                            explanations.append(f"Ideal for {time_period} visits")
                
                elif factor.type == ContextType.LOCATION:
                    if score_change > 0.1:
                        explanations.append("Conveniently located near you")
                    elif score_change < -0.1:
                        explanations.append("A bit further away, but worth the journey")
            
            return explanations
            
        except Exception as e:
            logger.error(f"Error generating contextual explanations: {str(e)}")
            return []
    
    def get_context_impact_summary(self, contextual_factors: List[ContextualFactor]) -> Dict[str, float]:
        """
        Get summary of contextual factor impacts
        """
        try:
            impact_summary = {}
            
            for factor in contextual_factors:
                impact_summary[factor.type.value] = {
                    'impact': factor.impact,
                    'confidence': factor.confidence,
                    'description': factor.description
                }
            
            return impact_summary
            
        except Exception as e:
            logger.error(f"Error getting context impact summary: {str(e)}")
            return {}