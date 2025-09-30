export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  visibility: number;
  uvIndex?: number;
  windSpeed: number;
  windDirection: number;
  conditions: WeatherCondition[];
  timestamp: Date;
}

export interface WeatherForecast {
  date: Date;
  temperature: {
    min: number;
    max: number;
    morning: number;
    day: number;
    evening: number;
    night: number;
  };
  conditions: WeatherCondition[];
  humidity: number;
  windSpeed: number;
  precipitationChance: number;
  precipitationAmount?: number;
}

export interface WeatherAlert {
  id: string;
  type: WeatherAlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  affectedActivities: string[];
  recommendations: string[];
}

export enum WeatherAlertType {
  TYPHOON = 'typhoon',
  HEAVY_RAIN = 'heavy_rain',
  EXTREME_HEAT = 'extreme_heat',
  THUNDERSTORM = 'thunderstorm',
  FOG = 'fog',
  STRONG_WIND = 'strong_wind'
}

export enum AlertSeverity {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export interface ActivityWeatherSuitability {
  activityType: string;
  suitabilityScore: number; // 0-100
  conditions: string[];
  recommendations: string[];
  alternatives?: string[];
}

export interface WeatherBasedRecommendation {
  currentWeather: CurrentWeather;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  activitySuitability: ActivityWeatherSuitability[];
  generalRecommendations: string[];
}

// OpenWeatherMap API response types
export interface OpenWeatherCurrentResponse {
  coord: { lon: number; lat: number };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export interface OpenWeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      sea_level: number;
      grnd_level: number;
      humidity: number;
      temp_kf: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
      gust?: number;
    };
    visibility: number;
    pop: number;
    rain?: {
      '3h': number;
    };
    sys: {
      pod: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}