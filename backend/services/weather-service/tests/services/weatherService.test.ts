import axios from 'axios';
import { WeatherService } from '../../src/services/weatherService';
import { OpenWeatherCurrentResponse, OpenWeatherForecastResponse } from '../../src/types/weather';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherService', () => {
  let weatherService: WeatherService;

  const mockCurrentWeatherResponse: OpenWeatherCurrentResponse = {
    coord: { lon: 114.1694, lat: 22.3193 },
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d'
      }
    ],
    base: 'stations',
    main: {
      temp: 25.5,
      feels_like: 27.2,
      temp_min: 24.0,
      temp_max: 27.0,
      pressure: 1013,
      humidity: 65
    },
    visibility: 10000,
    wind: {
      speed: 3.5,
      deg: 180
    },
    clouds: {
      all: 0
    },
    dt: 1640995200,
    sys: {
      type: 1,
      id: 9654,
      country: 'HK',
      sunrise: 1640995200,
      sunset: 1641031200
    },
    timezone: 28800,
    id: 1819729,
    name: 'Hong Kong',
    cod: 200
  };

  const mockForecastResponse: OpenWeatherForecastResponse = {
    cod: '200',
    message: 0,
    cnt: 40,
    list: [
      {
        dt: 1640995200,
        main: {
          temp: 25.5,
          feels_like: 27.2,
          temp_min: 24.0,
          temp_max: 27.0,
          pressure: 1013,
          sea_level: 1013,
          grnd_level: 1013,
          humidity: 65,
          temp_kf: 0
        },
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          }
        ],
        clouds: {
          all: 0
        },
        wind: {
          speed: 3.5,
          deg: 180
        },
        visibility: 10000,
        pop: 0.1,
        sys: {
          pod: 'd'
        },
        dt_txt: '2022-01-01 12:00:00'
      }
    ],
    city: {
      id: 1819729,
      name: 'Hong Kong',
      coord: {
        lat: 22.3193,
        lon: 114.1694
      },
      country: 'HK',
      population: 7012738,
      timezone: 28800,
      sunrise: 1640995200,
      sunset: 1641031200
    }
  };

  beforeEach(() => {
    // Set required environment variables
    process.env.OPENWEATHER_API_KEY = 'test-api-key';
    process.env.OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
    
    weatherService = new WeatherService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENWEATHER_API_KEY;
    delete process.env.OPENWEATHER_BASE_URL;
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      delete process.env.OPENWEATHER_API_KEY;
      expect(() => new WeatherService()).toThrow('OpenWeather API key is required');
    });

    it('should initialize with default base URL if not provided', () => {
      delete process.env.OPENWEATHER_BASE_URL;
      expect(() => new WeatherService()).not.toThrow();
    });
  });

  describe('getCurrentWeather', () => {
    it('should fetch and transform current weather data', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockCurrentWeatherResponse });

      const result = await weatherService.getCurrentWeather(22.3193, 114.1694);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/weather',
        {
          params: {
            lat: 22.3193,
            lon: 114.1694,
            appid: 'test-api-key',
            units: 'metric'
          }
        }
      );

      expect(result).toEqual({
        location: 'Hong Kong',
        temperature: 26, // rounded
        feelsLike: 27, // rounded
        humidity: 65,
        pressure: 1013,
        visibility: 10, // converted to km
        windSpeed: 3.5,
        windDirection: 180,
        conditions: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          }
        ],
        timestamp: new Date(1640995200 * 1000)
      });
    });

    it('should use default Hong Kong coordinates if not provided', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockCurrentWeatherResponse });

      await weatherService.getCurrentWeather();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            lat: 22.3193,
            lon: 114.1694
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(weatherService.getCurrentWeather()).rejects.toThrow('Failed to fetch current weather data');
    });

    it('should use cached data when available', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockCurrentWeatherResponse });

      // First call
      await weatherService.getCurrentWeather(22.3193, 114.1694);
      
      // Second call should use cache
      const result = await weatherService.getCurrentWeather(22.3193, 114.1694);

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(result.location).toBe('Hong Kong');
    });
  });

  describe('getWeatherForecast', () => {
    it('should fetch and transform forecast data', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockForecastResponse });

      const result = await weatherService.getWeatherForecast(22.3193, 114.1694, 5);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/forecast',
        {
          params: {
            lat: 22.3193,
            lon: 114.1694,
            appid: 'test-api-key',
            units: 'metric',
            cnt: 40 // 5 days * 8 forecasts per day
          }
        }
      );

      expect(result).toHaveLength(1); // Only one day in mock data
      expect(result[0]).toEqual({
        date: expect.any(Date),
        temperature: {
          min: 26,
          max: 26,
          morning: 26,
          day: 26,
          evening: 26,
          night: 26
        },
        conditions: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          }
        ],
        humidity: 65,
        windSpeed: 4, // rounded
        precipitationChance: 10, // pop * 100
        precipitationAmount: 0
      });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(weatherService.getWeatherForecast()).rejects.toThrow('Failed to fetch weather forecast data');
    });
  });

  describe('getWeatherAlerts', () => {
    it('should generate extreme heat alert', async () => {
      const hotWeather = {
        ...mockCurrentWeatherResponse,
        main: { ...mockCurrentWeatherResponse.main, temp: 36 }
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: hotWeather })
        .mockResolvedValueOnce({ data: mockForecastResponse });
      
      const currentWeather = await weatherService.getCurrentWeather();
      const forecast = await weatherService.getWeatherForecast();
      const alerts = await weatherService.getWeatherAlerts(currentWeather, forecast);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('extreme_heat');
      expect(alerts[0].severity).toBe('high');
      expect(alerts[0].affectedActivities).toContain('outdoor_hiking');
    });

    it('should generate strong wind alert', async () => {
      const windyWeather = {
        ...mockCurrentWeatherResponse,
        wind: { speed: 16, deg: 180 }
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: windyWeather })
        .mockResolvedValueOnce({ data: mockForecastResponse });
      
      const currentWeather = await weatherService.getCurrentWeather();
      const forecast = await weatherService.getWeatherForecast();
      const alerts = await weatherService.getWeatherAlerts(currentWeather, forecast);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('strong_wind');
      expect(alerts[0].affectedActivities).toContain('boat_tours');
    });

    it('should return empty array for good weather conditions', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockCurrentWeatherResponse })
        .mockResolvedValueOnce({ data: mockForecastResponse });
      
      const currentWeather = await weatherService.getCurrentWeather();
      const forecast = await weatherService.getWeatherForecast();
      const alerts = await weatherService.getWeatherAlerts(currentWeather, forecast);

      expect(alerts).toHaveLength(0);
    });
  });
});