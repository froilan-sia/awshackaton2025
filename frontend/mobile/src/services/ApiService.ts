import { User, Recommendation, Itinerary, GeoLocation } from '../types';

const API_BASE_URL = 'http://localhost:3000'; // Replace with actual API URL

export class ApiService {
  private static instance: ApiService;
  private authToken: string | null = null;

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User Management
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: Partial<User> & { password: string }): Promise<{ user: User; token: string }> {
    return this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserProfile(): Promise<User> {
    return this.makeRequest('/api/users/profile');
  }

  async updateUserProfile(userData: Partial<User>): Promise<User> {
    return this.makeRequest('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Recommendations
  async getPersonalizedRecommendations(
    location?: GeoLocation,
    filters?: {
      category?: string;
      weather?: string;
      crowdLevel?: string;
      interests?: string[];
    }
  ): Promise<Recommendation[]> {
    const params = new URLSearchParams();
    
    if (location) {
      params.append('lat', location.latitude.toString());
      params.append('lng', location.longitude.toString());
    }
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });
    }

    const queryString = params.toString();
    const endpoint = `/api/recommendations${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  async getRecommendationDetails(recommendationId: string): Promise<Recommendation> {
    return this.makeRequest(`/api/recommendations/${recommendationId}`);
  }

  // Itineraries
  async generateItinerary(preferences: {
    duration: number;
    interests: string[];
    budgetRange: string;
    groupType: string;
    startLocation?: GeoLocation;
  }): Promise<Itinerary> {
    return this.makeRequest('/api/itineraries/generate', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  async getUserItineraries(): Promise<Itinerary[]> {
    return this.makeRequest('/api/itineraries');
  }

  async getItinerary(itineraryId: string): Promise<Itinerary> {
    return this.makeRequest(`/api/itineraries/${itineraryId}`);
  }

  async updateItinerary(itineraryId: string, updates: Partial<Itinerary>): Promise<Itinerary> {
    return this.makeRequest(`/api/itineraries/${itineraryId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Location-based content
  async getLocationContent(latitude: number, longitude: number): Promise<{
    content: string;
    practicalTips: string[];
    culturalContext: string;
    safetyInfo: string[];
  }> {
    return this.makeRequest(`/api/location/content?lat=${latitude}&lng=${longitude}`);
  }

  async reportLocation(location: GeoLocation): Promise<void> {
    await this.makeRequest('/api/location/report', {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }

  // Weather and crowd data
  async getWeatherRecommendations(location: GeoLocation): Promise<{
    weather: any;
    recommendations: Recommendation[];
  }> {
    return this.makeRequest(`/api/weather/recommendations?lat=${location.latitude}&lng=${location.longitude}`);
  }

  async getCrowdData(locationIds: string[]): Promise<{
    [locationId: string]: {
      crowdLevel: string;
      alternatives: Recommendation[];
    };
  }> {
    return this.makeRequest('/api/crowd/data', {
      method: 'POST',
      body: JSON.stringify({ locationIds }),
    });
  }

  // Events
  async getEvents(location?: GeoLocation, date?: Date): Promise<any[]> {
    const params = new URLSearchParams();
    
    if (location) {
      params.append('lat', location.latitude.toString());
      params.append('lng', location.longitude.toString());
    }
    
    if (date) {
      params.append('date', date.toISOString());
    }

    const queryString = params.toString();
    const endpoint = `/api/events${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  // Push notifications
  async registerPushToken(token: string): Promise<void> {
    await this.makeRequest('/api/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ pushToken: token }),
    });
  }
}

export default ApiService;