import { EcoTransportOption, TransportationMode } from '../types/sustainability';
import { v4 as uuidv4 } from 'uuid';

export class EcoTransportService {
  private transportOptions: Map<string, EcoTransportOption> = new Map();

  constructor() {
    this.initializeTransportOptions();
  }

  private initializeTransportOptions(): void {
    const options: Omit<EcoTransportOption, 'id'>[] = [
      {
        type: TransportationMode.WALKING,
        route: { from: 'Central', to: 'Admiralty' },
        carbonFootprint: 0,
        cost: 0,
        duration: 15,
        availability: true,
        sustainabilityBenefit: 'Zero emissions, promotes health, and allows for better local exploration'
      },
      {
        type: TransportationMode.CYCLING,
        route: { from: 'Tsim Sha Tsui', to: 'West Kowloon' },
        carbonFootprint: 0,
        cost: 50, // Bike rental
        duration: 20,
        availability: true,
        sustainabilityBenefit: 'Zero emissions, efficient for medium distances, supports active tourism'
      },
      {
        type: TransportationMode.PUBLIC_TRANSPORT,
        route: { from: 'Central', to: 'Causeway Bay' },
        carbonFootprint: 0.05,
        cost: 12,
        duration: 10,
        availability: true,
        sustainabilityBenefit: 'Low emissions per person, efficient mass transit, reduces traffic congestion'
      },
      {
        type: TransportationMode.FERRY,
        route: { from: 'Central', to: 'Tsim Sha Tsui' },
        carbonFootprint: 0.08,
        cost: 3,
        duration: 8,
        availability: true,
        sustainabilityBenefit: 'Scenic route with low emissions, iconic Hong Kong experience'
      },
      {
        type: TransportationMode.ELECTRIC_VEHICLE,
        route: { from: 'Airport', to: 'Central' },
        carbonFootprint: 0.1,
        cost: 400,
        duration: 45,
        availability: true,
        sustainabilityBenefit: 'Lower emissions than traditional vehicles, quiet operation'
      }
    ];

    options.forEach(option => {
      const transportOption: EcoTransportOption = {
        ...option,
        id: uuidv4()
      };
      this.transportOptions.set(transportOption.id, transportOption);
    });
  }

  async getEcoTransportOptions(from: string, to: string): Promise<EcoTransportOption[]> {
    // In a real implementation, this would use routing APIs
    // For now, return all available options sorted by sustainability
    const allOptions = Array.from(this.transportOptions.values())
      .filter(option => option.availability)
      .sort((a, b) => a.carbonFootprint - b.carbonFootprint);

    return allOptions;
  }

  async getRecommendedTransport(
    from: string,
    to: string,
    preferences: {
      maxCost?: number;
      maxDuration?: number;
      prioritizeSustainability?: boolean;
    } = {}
  ): Promise<EcoTransportOption[]> {
    let options = await this.getEcoTransportOptions(from, to);

    // Apply filters
    if (preferences.maxCost) {
      options = options.filter(option => option.cost <= preferences.maxCost!);
    }

    if (preferences.maxDuration) {
      options = options.filter(option => option.duration <= preferences.maxDuration!);
    }

    // Sort by preference
    if (preferences.prioritizeSustainability) {
      options.sort((a, b) => a.carbonFootprint - b.carbonFootprint);
    } else {
      // Balance sustainability, cost, and time
      options.sort((a, b) => {
        const scoreA = this.calculateTransportScore(a);
        const scoreB = this.calculateTransportScore(b);
        return scoreB - scoreA;
      });
    }

    return options.slice(0, 3); // Return top 3 recommendations
  }

  private calculateTransportScore(option: EcoTransportOption): number {
    // Higher score is better
    let score = 100;

    // Penalize carbon footprint (0-50 points penalty)
    score -= Math.min(option.carbonFootprint * 200, 50);

    // Penalize cost (0-30 points penalty)
    score -= Math.min(option.cost / 20, 30);

    // Penalize duration (0-20 points penalty)
    score -= Math.min(option.duration / 5, 20);

    return Math.max(score, 0);
  }

  async calculateTripCarbonFootprint(
    transportModes: { mode: TransportationMode; distance: number }[]
  ): Promise<number> {
    const carbonFactors: Record<TransportationMode, number> = {
      [TransportationMode.WALKING]: 0,
      [TransportationMode.CYCLING]: 0,
      [TransportationMode.PUBLIC_TRANSPORT]: 0.05,
      [TransportationMode.FERRY]: 0.08,
      [TransportationMode.ELECTRIC_VEHICLE]: 0.1,
      [TransportationMode.TAXI]: 0.2,
      [TransportationMode.PRIVATE_CAR]: 0.25
    };

    return transportModes.reduce((total, transport) => {
      const factor = carbonFactors[transport.mode] || 0.2; // Default to taxi if unknown
      return total + (transport.distance * factor);
    }, 0);
  }

  async getSustainabilityTips(transportMode: TransportationMode): Promise<string[]> {
    const tips: Record<TransportationMode, string[]> = {
      [TransportationMode.WALKING]: [
        'Walking is the most sustainable way to explore Hong Kong',
        'Use pedestrian bridges and walkways for safe city exploration',
        'Wear comfortable shoes and stay hydrated',
        'Take time to discover hidden local gems along the way'
      ],
      [TransportationMode.CYCLING]: [
        'Cycling reduces emissions and provides great exercise',
        'Use designated cycling paths for safety',
        'Consider bike-sharing programs for convenience',
        'Explore waterfront cycling routes for scenic views'
      ],
      [TransportationMode.PUBLIC_TRANSPORT]: [
        'MTR and buses are highly efficient and low-emission',
        'Use an Octopus card for seamless travel',
        'Avoid peak hours when possible to reduce crowding',
        'Public transport connects you directly to local communities'
      ],
      [TransportationMode.FERRY]: [
        'Star Ferry offers an iconic low-carbon experience',
        'Ferries provide beautiful harbor views',
        'Support traditional Hong Kong transportation',
        'Perfect for short harbor crossings'
      ],
      [TransportationMode.ELECTRIC_VEHICLE]: [
        'Choose electric vehicles over traditional cars',
        'Share rides when possible to maximize efficiency',
        'Electric vehicles are quieter and cleaner',
        'Good option for longer distances or with luggage'
      ],
      [TransportationMode.TAXI]: [
        'Consider sharing taxis to reduce per-person emissions',
        'Use taxis only when other options are not available',
        'Choose the shortest route to minimize impact',
        'Tip: Many Hong Kong taxis now accept electronic payments'
      ],
      [TransportationMode.PRIVATE_CAR]: [
        'Private cars have the highest environmental impact',
        'Consider car-sharing if you must use a private vehicle',
        'Plan efficient routes to minimize driving time',
        'Explore public transport alternatives for your journey'
      ]
    };

    return tips[transportMode] || ['Consider more sustainable transport options when available'];
  }

  async getTransportModeImpact(mode: TransportationMode): Promise<{
    carbonFootprint: number;
    sustainabilityRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    description: string;
  }> {
    const impacts = {
      [TransportationMode.WALKING]: {
        carbonFootprint: 0,
        sustainabilityRating: 'Excellent' as const,
        description: 'Zero emissions, promotes health, and enhances local discovery'
      },
      [TransportationMode.CYCLING]: {
        carbonFootprint: 0,
        sustainabilityRating: 'Excellent' as const,
        description: 'Zero emissions, efficient for medium distances, promotes active tourism'
      },
      [TransportationMode.PUBLIC_TRANSPORT]: {
        carbonFootprint: 0.05,
        sustainabilityRating: 'Excellent' as const,
        description: 'Very low emissions per person, highly efficient mass transit system'
      },
      [TransportationMode.FERRY]: {
        carbonFootprint: 0.08,
        sustainabilityRating: 'Good' as const,
        description: 'Low emissions with cultural and scenic value'
      },
      [TransportationMode.ELECTRIC_VEHICLE]: {
        carbonFootprint: 0.1,
        sustainabilityRating: 'Good' as const,
        description: 'Lower emissions than conventional vehicles, quiet operation'
      },
      [TransportationMode.TAXI]: {
        carbonFootprint: 0.2,
        sustainabilityRating: 'Fair' as const,
        description: 'Moderate emissions, convenient but less sustainable'
      },
      [TransportationMode.PRIVATE_CAR]: {
        carbonFootprint: 0.25,
        sustainabilityRating: 'Poor' as const,
        description: 'Highest emissions, contributes to traffic congestion'
      }
    };

    return impacts[mode];
  }
}