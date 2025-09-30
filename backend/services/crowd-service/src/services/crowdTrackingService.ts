import { CrowdData, CrowdLevel, CrowdDataSource, CrowdPrediction } from '../types/crowd';
import { CrowdDataModel } from '../models/CrowdData';

export class CrowdTrackingService {
  private crowdDataCache: Map<string, CrowdDataModel> = new Map();
  private mockDataEnabled: boolean = true;

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get current crowd data for a specific location
   */
  public async getCrowdData(locationId: string): Promise<CrowdDataModel | null> {
    const cachedData = this.crowdDataCache.get(locationId);
    
    if (cachedData && cachedData.isDataFresh()) {
      return cachedData;
    }

    // In production, this would fetch from external APIs
    if (this.mockDataEnabled) {
      return this.generateMockCrowdData(locationId);
    }

    return null;
  }

  /**
   * Get crowd data for multiple locations
   */
  public async getBulkCrowdData(locationIds: string[]): Promise<Map<string, CrowdDataModel>> {
    const results = new Map<string, CrowdDataModel>();

    for (const locationId of locationIds) {
      const crowdData = await this.getCrowdData(locationId);
      if (crowdData) {
        results.set(locationId, crowdData);
      }
    }

    return results;
  }

  /**
   * Update crowd data for a location
   */
  public async updateCrowdData(locationId: string, data: Partial<CrowdData>): Promise<CrowdDataModel> {
    const existingData = this.crowdDataCache.get(locationId);
    
    const updatedData: CrowdData = {
      locationId,
      locationName: data.locationName || existingData?.locationName || 'Unknown Location',
      coordinates: data.coordinates || existingData?.coordinates || { latitude: 0, longitude: 0 },
      crowdLevel: data.crowdLevel || existingData?.crowdLevel || CrowdLevel.LOW,
      estimatedWaitTime: data.estimatedWaitTime || existingData?.estimatedWaitTime || 0,
      capacity: data.capacity || existingData?.capacity || 100,
      currentOccupancy: data.currentOccupancy || existingData?.currentOccupancy || 0,
      timestamp: new Date(),
      dataSource: data.dataSource || CrowdDataSource.MOCK,
      confidence: data.confidence || existingData?.confidence || 0.8
    };

    const crowdDataModel = new CrowdDataModel(updatedData);
    this.crowdDataCache.set(locationId, crowdDataModel);

    return crowdDataModel;
  }

  /**
   * Get crowd predictions for a location
   */
  public async getCrowdPredictions(locationId: string, hours: number = 24): Promise<CrowdPrediction[]> {
    const predictions: CrowdPrediction[] = [];
    const now = new Date();

    // Generate hourly predictions
    for (let i = 1; i <= hours; i++) {
      const timeSlot = new Date(now.getTime() + i * 60 * 60 * 1000);
      const prediction = this.generateCrowdPrediction(locationId, timeSlot);
      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Get locations with high crowd levels
   */
  public async getHighCrowdLocations(): Promise<CrowdDataModel[]> {
    const highCrowdLocations: CrowdDataModel[] = [];

    for (const [, crowdData] of this.crowdDataCache) {
      if (crowdData.isOvercrowded() && crowdData.isDataFresh()) {
        highCrowdLocations.push(crowdData);
      }
    }

    return highCrowdLocations;
  }

  /**
   * Calculate crowd level based on occupancy
   */
  public calculateCrowdLevel(occupancy: number, capacity: number): CrowdLevel {
    const percentage = (occupancy / capacity) * 100;

    if (percentage >= 90) return CrowdLevel.VERY_HIGH;
    if (percentage >= 70) return CrowdLevel.HIGH;
    if (percentage >= 40) return CrowdLevel.MODERATE;
    return CrowdLevel.LOW;
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData(): void {
    const mockLocations = [
      {
        locationId: 'hk-disneyland',
        locationName: 'Hong Kong Disneyland',
        coordinates: { latitude: 22.3129, longitude: 114.0413 },
        capacity: 50000
      },
      {
        locationId: 'victoria-peak',
        locationName: 'Victoria Peak',
        coordinates: { latitude: 22.2783, longitude: 114.1747 },
        capacity: 5000
      },
      {
        locationId: 'tsim-sha-tsui-promenade',
        locationName: 'Tsim Sha Tsui Promenade',
        coordinates: { latitude: 22.2940, longitude: 114.1722 },
        capacity: 10000
      },
      {
        locationId: 'central-ifc-mall',
        locationName: 'IFC Mall Central',
        coordinates: { latitude: 22.2855, longitude: 114.1577 },
        capacity: 15000
      },
      {
        locationId: 'ocean-park',
        locationName: 'Ocean Park',
        coordinates: { latitude: 22.2462, longitude: 114.1766 },
        capacity: 35000
      }
    ];

    mockLocations.forEach(location => {
      const mockData = this.generateMockCrowdData(location.locationId, location);
      this.crowdDataCache.set(location.locationId, mockData);
    });
  }

  /**
   * Generate mock crowd data for testing
   */
  private generateMockCrowdData(locationId: string, locationInfo?: any): CrowdDataModel {
    const hour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());
    
    // Simulate crowd patterns based on time and day
    let baseCrowd = 0.3; // 30% base occupancy
    
    // Peak hours (10-12, 14-16, 19-21)
    if ((hour >= 10 && hour <= 12) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21)) {
      baseCrowd += 0.3;
    }
    
    // Weekend boost
    if (isWeekend) {
      baseCrowd += 0.2;
    }
    
    // Add some randomness
    baseCrowd += (Math.random() - 0.5) * 0.2;
    baseCrowd = Math.max(0.1, Math.min(0.95, baseCrowd));

    const capacity = locationInfo?.capacity || 1000;
    const currentOccupancy = Math.floor(capacity * baseCrowd);
    const crowdLevel = this.calculateCrowdLevel(currentOccupancy, capacity);
    
    // Estimate wait time based on crowd level
    let waitTime = 0;
    switch (crowdLevel) {
      case CrowdLevel.LOW:
        waitTime = Math.floor(Math.random() * 5);
        break;
      case CrowdLevel.MODERATE:
        waitTime = Math.floor(Math.random() * 15) + 5;
        break;
      case CrowdLevel.HIGH:
        waitTime = Math.floor(Math.random() * 30) + 15;
        break;
      case CrowdLevel.VERY_HIGH:
        waitTime = Math.floor(Math.random() * 60) + 30;
        break;
    }

    const crowdData: CrowdData = {
      locationId,
      locationName: locationInfo?.locationName || `Location ${locationId}`,
      coordinates: locationInfo?.coordinates || { latitude: 22.3193, longitude: 114.1694 },
      crowdLevel,
      estimatedWaitTime: waitTime,
      capacity,
      currentOccupancy,
      timestamp: new Date(),
      dataSource: CrowdDataSource.MOCK,
      confidence: 0.8
    };

    return new CrowdDataModel(crowdData);
  }

  /**
   * Generate crowd prediction for a specific time slot
   */
  private generateCrowdPrediction(locationId: string, timeSlot: Date): CrowdPrediction {
    const hour = timeSlot.getHours();
    const isWeekend = [0, 6].includes(timeSlot.getDay());
    
    let predictedCrowd = 0.3;
    
    // Peak hours prediction
    if ((hour >= 10 && hour <= 12) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21)) {
      predictedCrowd += 0.3;
    }
    
    if (isWeekend) {
      predictedCrowd += 0.2;
    }
    
    predictedCrowd = Math.max(0.1, Math.min(0.95, predictedCrowd));
    
    const capacity = 1000; // Default capacity
    const predictedOccupancy = Math.floor(capacity * predictedCrowd);
    const predictedCrowdLevel = this.calculateCrowdLevel(predictedOccupancy, capacity);
    
    let predictedWaitTime = 0;
    switch (predictedCrowdLevel) {
      case CrowdLevel.LOW:
        predictedWaitTime = 2;
        break;
      case CrowdLevel.MODERATE:
        predictedWaitTime = 10;
        break;
      case CrowdLevel.HIGH:
        predictedWaitTime = 25;
        break;
      case CrowdLevel.VERY_HIGH:
        predictedWaitTime = 45;
        break;
    }

    return {
      locationId,
      predictedCrowdLevel,
      predictedWaitTime,
      timeSlot,
      confidence: 0.7
    };
  }
}