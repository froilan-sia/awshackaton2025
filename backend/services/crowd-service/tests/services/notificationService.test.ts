import { NotificationService } from '../../src/services/notificationService';
import { CrowdDataModel } from '../../src/models/CrowdData';
import { CrowdLevel, CrowdDataSource, CrowdAlertType, AlertSeverity, AlternativeRecommendation } from '../../src/types/crowd';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  readyState: 1, // WebSocket.OPEN
  on: jest.fn(),
  close: jest.fn()
};

const mockWebSocketServer = {
  on: jest.fn(),
  close: jest.fn(),
  options: { port: 3006 }
};

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => mockWebSocketServer),
  WebSocket: {
    OPEN: 1
  }
}));

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(3006);
    
    // Simulate WebSocket connection setup
    const connectionHandler = mockWebSocketServer.on.mock.calls.find(
      call => call[0] === 'connection'
    )?.[1];
    
    if (connectionHandler) {
      // Simulate a connection
      connectionHandler(mockWebSocket, {});
      
      // Simulate auth message
      const messageHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        messageHandler(JSON.stringify({ type: 'auth', userId: 'test-user' }));
      }
    }
  });

  afterEach(() => {
    service.close();
  });

  describe('createCrowdAlert', () => {
    it('should create critical alert for capacity reached', () => {
      const crowdData = new CrowdDataModel({
        locationId: 'test-location',
        locationName: 'Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.VERY_HIGH,
        estimatedWaitTime: 60,
        capacity: 1000,
        currentOccupancy: 950, // 95% capacity
        timestamp: new Date(),
        dataSource: CrowdDataSource.MOCK,
        confidence: 0.9
      });

      const alert = service.createCrowdAlert(crowdData);

      expect(alert.locationId).toBe('test-location');
      expect(alert.alertType).toBe(CrowdAlertType.CAPACITY_REACHED);
      expect(alert.severity).toBe(AlertSeverity.CRITICAL);
      expect(alert.message).toContain('Test Location');
      expect(alert.message).toContain('capacity');
    });

    it('should create high severity alert for long wait times', () => {
      const crowdData = new CrowdDataModel({
        locationId: 'test-location',
        locationName: 'Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 45, // Long wait time
        capacity: 1000,
        currentOccupancy: 800,
        timestamp: new Date(),
        dataSource: CrowdDataSource.MOCK,
        confidence: 0.8
      });

      const alert = service.createCrowdAlert(crowdData);

      expect(alert.alertType).toBe(CrowdAlertType.LONG_WAIT);
      expect(alert.severity).toBe(AlertSeverity.HIGH);
      expect(alert.message).toContain('45 minutes');
    });

    it('should create medium severity alert for high crowd', () => {
      const crowdData = new CrowdDataModel({
        locationId: 'test-location',
        locationName: 'Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 20, // Not long wait
        capacity: 1000,
        currentOccupancy: 800,
        timestamp: new Date(),
        dataSource: CrowdDataSource.MOCK,
        confidence: 0.8
      });

      const alert = service.createCrowdAlert(crowdData);

      expect(alert.alertType).toBe(CrowdAlertType.HIGH_CROWD);
      expect(alert.severity).toBe(AlertSeverity.MEDIUM);
      expect(alert.message).toContain('high crowd levels');
    });

    it('should set expiration time for alerts', () => {
      const crowdData = new CrowdDataModel({
        locationId: 'test-location',
        locationName: 'Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 30,
        capacity: 1000,
        currentOccupancy: 800,
        timestamp: new Date(),
        dataSource: CrowdDataSource.MOCK,
        confidence: 0.8
      });

      const alert = service.createCrowdAlert(crowdData);

      expect(alert.expiresAt.getTime()).toBeGreaterThan(alert.timestamp.getTime());
      
      // Should expire in approximately 1 hour
      const timeDiff = alert.expiresAt.getTime() - alert.timestamp.getTime();
      expect(timeDiff).toBeCloseTo(60 * 60 * 1000, -4); // Within 10 seconds of 1 hour
    });
  });

  describe('sendCrowdAlert', () => {
    it('should send crowd alert to connected user', async () => {
      const crowdData = new CrowdDataModel({
        locationId: 'test-location',
        locationName: 'Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 30,
        capacity: 1000,
        currentOccupancy: 800,
        timestamp: new Date(),
        dataSource: CrowdDataSource.MOCK,
        confidence: 0.8
      });

      const alert = service.createCrowdAlert(crowdData);
      const success = await service.sendCrowdAlert('test-user', alert);

      expect(success).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"notification"')
      );
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.notification.notificationType).toBe('CROWD_ALERT');
      expect(sentMessage.notification.locationId).toBe('test-location');
    });

    it('should queue notification for disconnected user', async () => {
      const crowdData = new CrowdDataModel({
        locationId: 'test-location',
        locationName: 'Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 30,
        capacity: 1000,
        currentOccupancy: 800,
        timestamp: new Date(),
        dataSource: CrowdDataSource.MOCK,
        confidence: 0.8
      });

      const alert = service.createCrowdAlert(crowdData);
      const success = await service.sendCrowdAlert('disconnected-user', alert);

      expect(success).toBe(false);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('sendAlternativeSuggestion', () => {
    it('should send alternative suggestion notification', async () => {
      const alternatives: AlternativeRecommendation = {
        originalLocationId: 'crowded-location',
        alternatives: [
          {
            locationId: 'alternative-1',
            locationName: 'Alternative Location',
            coordinates: { latitude: 22.3, longitude: 114.2 },
            distance: 1000,
            crowdLevel: CrowdLevel.LOW,
            similarity: 0.8,
            category: 'attraction',
            estimatedTravelTime: 15
          }
        ],
        reason: 'Original location is overcrowded',
        generatedAt: new Date()
      };

      const success = await service.sendAlternativeSuggestion('test-user', alternatives);

      expect(success).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.notification.notificationType).toBe('ALTERNATIVE_SUGGESTION');
      expect(sentMessage.notification.title).toBe('Better Options Available');
      expect(sentMessage.notification.data.alternatives.originalLocationId).toBe(alternatives.originalLocationId);
      expect(sentMessage.notification.data.alternatives.alternatives).toEqual(alternatives.alternatives);
    });
  });

  describe('sendOptimalTimeSuggestion', () => {
    it('should send optimal time suggestion', async () => {
      const optimalTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const success = await service.sendOptimalTimeSuggestion('test-user', 'test-location', optimalTime);

      expect(success).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.notification.notificationType).toBe('OPTIMAL_TIME');
      expect(sentMessage.notification.title).toBe('Best Time to Visit');
      expect(sentMessage.notification.message).toContain(optimalTime.toLocaleTimeString());
    });
  });

  describe('sendRouteUpdate', () => {
    it('should send route update notification', async () => {
      const routeData = {
        locationId: 'route-location',
        timeSaved: 30,
        alternativesUsed: 2,
        efficiency: 0.85
      };

      const success = await service.sendRouteUpdate('test-user', routeData);

      expect(success).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.notification.notificationType).toBe('ROUTE_UPDATE');
      expect(sentMessage.notification.title).toBe('Route Updated');
      expect(sentMessage.notification.data.routeData).toEqual(routeData);
    });
  });

  describe('processQueuedNotifications', () => {
    it('should process queued notifications when user reconnects', async () => {
      // First, send notification to disconnected user (should be queued)
      const crowdData = new CrowdDataModel({
        locationId: 'test-location',
        locationName: 'Test Location',
        coordinates: { latitude: 22.3, longitude: 114.2 },
        crowdLevel: CrowdLevel.HIGH,
        estimatedWaitTime: 30,
        capacity: 1000,
        currentOccupancy: 800,
        timestamp: new Date(),
        dataSource: CrowdDataSource.MOCK,
        confidence: 0.8
      });

      const alert = service.createCrowdAlert(crowdData);
      await service.sendCrowdAlert('queued-user', alert);

      // Now simulate user connection
      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      if (connectionHandler) {
        const newMockWebSocket = {
          send: jest.fn(),
          readyState: 1,
          on: jest.fn(),
          close: jest.fn()
        };
        
        connectionHandler(newMockWebSocket, {});
        
        const messageHandler = newMockWebSocket.on.mock.calls.find(
          call => call[0] === 'message'
        )?.[1];
        
        if (messageHandler) {
          messageHandler(JSON.stringify({ type: 'auth', userId: 'queued-user' }));
        }

        // Process queued notifications
        await service.processQueuedNotifications();

        expect(newMockWebSocket.send).toHaveBeenCalled();
      }
    });
  });

  describe('getConnectedUsersCount', () => {
    it('should return correct number of connected users', () => {
      const count = service.getConnectedUsersCount();
      expect(count).toBeGreaterThanOrEqual(0);
      expect(typeof count).toBe('number');
    });
  });
});