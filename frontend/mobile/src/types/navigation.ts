export type RootStackParamList = {
  Home: undefined;
  Recommendations: {
    filters?: {
      category?: string;
      weather?: string;
      crowdLevel?: string;
    };
  };
  Itinerary: {
    itineraryId?: string;
  };
  Location: {
    locationId?: string;
    latitude?: number;
    longitude?: number;
  };
  Profile: undefined;
};

export type NavigationProps = {
  navigation: any;
  route: any;
};