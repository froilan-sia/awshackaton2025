import { TravelInfo, TransportationMode, GeoLocation } from '../types/itinerary';

export class TravelCalculationService {
  private readonly WALKING_SPEED_KMH = 4; // Average walking speed
  private readonly MTR_AVERAGE_SPEED_KMH = 35; // Including stops and transfers
  private readonly BUS_AVERAGE_SPEED_KMH = 15; // In Hong Kong traffic
  private readonly TAXI_AVERAGE_SPEED_KMH = 20; // In Hong Kong traffic
  private readonly TRAM_AVERAGE_SPEED_KMH = 12;
  private readonly FERRY_AVERAGE_SPEED_KMH = 15;

  /**
   * Calculate travel information between two locations
   */
  async calculateTravel(
    from: GeoLocation,
    to: GeoLocation,
    allowedModes: TransportationMode[]
  ): Promise<TravelInfo> {
    try {
      const distance = this.calculateDistance(from, to);
      
      // Calculate travel options for each allowed mode
      const travelOptions = await Promise.all(
        allowedModes.map(mode => this.calculateTravelForMode(from, to, distance, mode))
      );

      // Select the best option based on time and cost efficiency
      const bestOption = this.selectBestTravelOption(travelOptions);
      
      return bestOption;
    } catch (error) {
      console.error('Error calculating travel:', error);
      // Fallback to walking
      return this.calculateWalkingTravel(from, to);
    }
  }

  /**
   * Calculate travel for a specific transportation mode
   */
  private async calculateTravelForMode(
    from: GeoLocation,
    to: GeoLocation,
    distance: number,
    mode: TransportationMode
  ): Promise<TravelInfo> {
    switch (mode) {
      case TransportationMode.WALKING:
        return this.calculateWalkingTravel(from, to, distance);
      
      case TransportationMode.MTR:
        return this.calculateMTRTravel(from, to, distance);
      
      case TransportationMode.BUS:
        return this.calculateBusTravel(from, to, distance);
      
      case TransportationMode.TAXI:
        return this.calculateTaxiTravel(from, to, distance);
      
      case TransportationMode.TRAM:
        return this.calculateTramTravel(from, to, distance);
      
      case TransportationMode.FERRY:
        return this.calculateFerryTravel(from, to, distance);
      
      default:
        return this.calculateWalkingTravel(from, to, distance);
    }
  }

  /**
   * Calculate walking travel
   */
  private calculateWalkingTravel(
    from: GeoLocation,
    to: GeoLocation,
    distance?: number
  ): TravelInfo {
    const travelDistance = distance || this.calculateDistance(from, to);
    const durationMinutes = Math.round((travelDistance / 1000) / this.WALKING_SPEED_KMH * 60);

    return {
      mode: TransportationMode.WALKING,
      duration: Math.max(5, durationMinutes), // Minimum 5 minutes
      distance: travelDistance,
      cost: 0,
      instructions: [
        `Walk ${Math.round(travelDistance)}m to destination`,
        `Estimated walking time: ${durationMinutes} minutes`
      ]
    };
  }

  /**
   * Calculate MTR travel
   */
  private calculateMTRTravel(
    from: GeoLocation,
    to: GeoLocation,
    distance: number
  ): TravelInfo {
    // Find nearest MTR stations (simplified - in production would use real station data)
    const nearestFromStation = this.findNearestMTRStation(from);
    const nearestToStation = this.findNearestMTRStation(to);

    if (!nearestFromStation || !nearestToStation) {
      // Fallback to walking if no MTR stations nearby
      return this.calculateWalkingTravel(from, to, distance);
    }

    // Calculate walking to/from stations
    const walkToStation = this.calculateDistance(from, nearestFromStation.location);
    const walkFromStation = this.calculateDistance(nearestToStation.location, to);
    const walkingTime = Math.round(((walkToStation + walkFromStation) / 1000) / this.WALKING_SPEED_KMH * 60);

    // Calculate MTR travel time
    const mtrDistance = this.calculateDistance(nearestFromStation.location, nearestToStation.location);
    const mtrTime = Math.round((mtrDistance / 1000) / this.MTR_AVERAGE_SPEED_KMH * 60);

    // Add transfer and waiting time
    const totalTime = walkingTime + mtrTime + 10; // 10 minutes for waiting/transfers

    // Calculate cost (simplified Hong Kong MTR pricing)
    const cost = this.calculateMTRCost(mtrDistance);

    return {
      mode: TransportationMode.MTR,
      duration: totalTime,
      distance: walkToStation + mtrDistance + walkFromStation,
      cost,
      instructions: [
        `Walk ${Math.round(walkToStation)}m to ${nearestFromStation.name} Station`,
        `Take MTR to ${nearestToStation.name} Station`,
        `Walk ${Math.round(walkFromStation)}m to destination`,
        `Total travel time: ${totalTime} minutes`
      ]
    };
  }

  /**
   * Calculate bus travel
   */
  private calculateBusTravel(
    from: GeoLocation,
    to: GeoLocation,
    distance: number
  ): TravelInfo {
    // Simplified bus calculation
    const travelTime = Math.round((distance / 1000) / this.BUS_AVERAGE_SPEED_KMH * 60);
    const totalTime = travelTime + 15; // Add waiting time
    const cost = 5; // Average bus fare in HKD

    return {
      mode: TransportationMode.BUS,
      duration: totalTime,
      distance,
      cost,
      instructions: [
        `Take bus to destination`,
        `Estimated travel time: ${totalTime} minutes`,
        `Fare: HK$${cost}`
      ]
    };
  }

  /**
   * Calculate taxi travel
   */
  private calculateTaxiTravel(
    from: GeoLocation,
    to: GeoLocation,
    distance: number
  ): TravelInfo {
    const travelTime = Math.round((distance / 1000) / this.TAXI_AVERAGE_SPEED_KMH * 60);
    const cost = this.calculateTaxiCost(distance);

    return {
      mode: TransportationMode.TAXI,
      duration: travelTime + 5, // Add pickup time
      distance,
      cost,
      instructions: [
        `Take taxi to destination`,
        `Estimated travel time: ${travelTime} minutes`,
        `Estimated fare: HK$${cost}`
      ]
    };
  }

  /**
   * Calculate tram travel
   */
  private calculateTramTravel(
    from: GeoLocation,
    to: GeoLocation,
    distance: number
  ): TravelInfo {
    // Check if locations are on tram routes (simplified)
    if (!this.isOnTramRoute(from) || !this.isOnTramRoute(to)) {
      return this.calculateWalkingTravel(from, to, distance);
    }

    const travelTime = Math.round((distance / 1000) / this.TRAM_AVERAGE_SPEED_KMH * 60);
    const totalTime = travelTime + 10; // Add waiting time
    const cost = 3; // Fixed tram fare

    return {
      mode: TransportationMode.TRAM,
      duration: totalTime,
      distance,
      cost,
      instructions: [
        `Take tram to destination`,
        `Estimated travel time: ${totalTime} minutes`,
        `Fare: HK$${cost}`
      ]
    };
  }

  /**
   * Calculate ferry travel
   */
  private calculateFerryTravel(
    from: GeoLocation,
    to: GeoLocation,
    distance: number
  ): TravelInfo {
    // Check if locations are near ferry terminals
    if (!this.isNearFerryTerminal(from) || !this.isNearFerryTerminal(to)) {
      return this.calculateWalkingTravel(from, to, distance);
    }

    const travelTime = Math.round((distance / 1000) / this.FERRY_AVERAGE_SPEED_KMH * 60);
    const totalTime = travelTime + 15; // Add waiting and boarding time
    const cost = 3; // Average ferry fare

    return {
      mode: TransportationMode.FERRY,
      duration: totalTime,
      distance,
      cost,
      instructions: [
        `Take ferry to destination`,
        `Estimated travel time: ${totalTime} minutes`,
        `Fare: HK$${cost}`
      ]
    };
  }

  /**
   * Select the best travel option based on efficiency
   */
  private selectBestTravelOption(options: TravelInfo[]): TravelInfo {
    if (options.length === 0) {
      throw new Error('No travel options available');
    }

    // Score each option based on time and cost efficiency
    const scoredOptions = options.map(option => ({
      option,
      score: this.calculateTravelScore(option)
    }));

    // Sort by score (higher is better)
    scoredOptions.sort((a, b) => b.score - a.score);

    return scoredOptions[0].option;
  }

  /**
   * Calculate travel score for option selection
   */
  private calculateTravelScore(travel: TravelInfo): number {
    let score = 0;

    // Time efficiency (lower time = higher score)
    score += Math.max(0, 100 - travel.duration);

    // Cost efficiency (lower cost = higher score)
    score += Math.max(0, 50 - travel.cost);

    // Mode preferences (some modes are generally preferred)
    switch (travel.mode) {
      case TransportationMode.MTR:
        score += 20; // MTR is efficient and reliable
        break;
      case TransportationMode.WALKING:
        score += travel.distance < 1000 ? 15 : -10; // Good for short distances
        break;
      case TransportationMode.TAXI:
        score += 10; // Convenient but expensive
        break;
      case TransportationMode.FERRY:
        score += 15; // Scenic and efficient for harbor crossings
        break;
      case TransportationMode.TRAM:
        score += 5; // Slow but cheap
        break;
      case TransportationMode.BUS:
        score += 5; // Variable efficiency
        break;
    }

    return score;
  }

  /**
   * Calculate distance between two locations using Haversine formula
   */
  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return distance in meters
  }

  /**
   * Find nearest MTR station (simplified)
   */
  private findNearestMTRStation(location: GeoLocation): { name: string; location: GeoLocation } | null {
    // Mock MTR stations - in production this would be a comprehensive database
    const mtrStations = [
      { name: 'Central', location: { latitude: 22.2819, longitude: 114.1578 } },
      { name: 'Admiralty', location: { latitude: 22.2783, longitude: 114.1650 } },
      { name: 'Tsim Sha Tsui', location: { latitude: 22.2976, longitude: 114.1722 } },
      { name: 'Mong Kok', location: { latitude: 22.3193, longitude: 114.1694 } },
      { name: 'Causeway Bay', location: { latitude: 22.2800, longitude: 114.1844 } }
    ];

    let nearest = null;
    let minDistance = Infinity;

    for (const station of mtrStations) {
      const distance = this.calculateDistance(location, station.location);
      if (distance < minDistance && distance < 1000) { // Within 1km
        minDistance = distance;
        nearest = station;
      }
    }

    return nearest;
  }

  /**
   * Calculate MTR cost based on distance
   */
  private calculateMTRCost(distance: number): number {
    // Simplified Hong Kong MTR pricing
    if (distance < 2000) return 5;
    if (distance < 5000) return 8;
    if (distance < 10000) return 12;
    if (distance < 20000) return 18;
    return 25;
  }

  /**
   * Calculate taxi cost based on distance
   */
  private calculateTaxiCost(distance: number): number {
    // Hong Kong taxi pricing (simplified)
    const baseFare = 27; // HKD for first 2km
    const additionalDistance = Math.max(0, distance - 2000);
    const additionalCost = Math.ceil(additionalDistance / 200) * 1.9; // HKD 1.9 per 200m
    return Math.round(baseFare + additionalCost);
  }

  /**
   * Check if location is on tram route (simplified)
   */
  private isOnTramRoute(location: GeoLocation): boolean {
    // Hong Kong trams run on Hong Kong Island, roughly along the north shore
    return (
      location.latitude >= 22.27 && 
      location.latitude <= 22.29 && 
      location.longitude >= 114.13 && 
      location.longitude <= 114.22
    );
  }

  /**
   * Check if location is near ferry terminal (simplified)
   */
  private isNearFerryTerminal(location: GeoLocation): boolean {
    const ferryTerminals = [
      { latitude: 22.2944, longitude: 114.1691 }, // Tsim Sha Tsui
      { latitude: 22.2870, longitude: 114.1578 }, // Central
      { latitude: 22.2920, longitude: 114.1975 }  // Wan Chai
    ];

    return ferryTerminals.some(terminal => 
      this.calculateDistance(location, terminal) < 500 // Within 500m
    );
  }
}