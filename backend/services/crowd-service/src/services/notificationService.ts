import { WebSocket, WebSocketServer } from 'ws';
import { CrowdAlert, CrowdNotification, NotificationType, AlertSeverity, CrowdAlertType } from '../types/crowd';
import { CrowdDataModel } from '../models/CrowdData';
import { AlternativeRecommendation } from '../types/crowd';

export class NotificationService {
  private wss: WebSocketServer;
  private userConnections: Map<string, WebSocket> = new Map();
  private notificationQueue: CrowdNotification[] = [];

  constructor(port: number = 3006) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
  }

  /**
   * Setup WebSocket server for real-time notifications
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('New WebSocket connection established');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'auth' && data.userId) {
            this.userConnections.set(data.userId, ws);
            console.log(`User ${data.userId} connected`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        // Remove user connection
        for (const [userId, connection] of this.userConnections) {
          if (connection === ws) {
            this.userConnections.delete(userId);
            console.log(`User ${userId} disconnected`);
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log(`WebSocket server started on port ${this.wss.options.port}`);
  }

  /**
   * Send crowd alert to specific user
   */
  public async sendCrowdAlert(userId: string, alert: CrowdAlert): Promise<boolean> {
    const notification: CrowdNotification = {
      userId,
      locationId: alert.locationId,
      notificationType: NotificationType.CROWD_ALERT,
      title: this.getAlertTitle(alert.alertType),
      message: alert.message,
      data: {
        alert,
        alternatives: alert.alternatives
      },
      timestamp: new Date(),
      sent: false
    };

    return this.sendNotification(notification);
  }

  /**
   * Send alternative suggestions to user
   */
  public async sendAlternativeSuggestion(userId: string, alternatives: AlternativeRecommendation): Promise<boolean> {
    const notification: CrowdNotification = {
      userId,
      locationId: alternatives.originalLocationId,
      notificationType: NotificationType.ALTERNATIVE_SUGGESTION,
      title: 'Better Options Available',
      message: `We found ${alternatives.alternatives.length} great alternatives near your planned location.`,
      data: { alternatives },
      timestamp: new Date(),
      sent: false
    };

    return this.sendNotification(notification);
  }

  /**
   * Send optimal time suggestion
   */
  public async sendOptimalTimeSuggestion(userId: string, locationId: string, optimalTime: Date): Promise<boolean> {
    const notification: CrowdNotification = {
      userId,
      locationId,
      notificationType: NotificationType.OPTIMAL_TIME,
      title: 'Best Time to Visit',
      message: `The best time to visit this location would be around ${optimalTime.toLocaleTimeString()}.`,
      data: { optimalTime },
      timestamp: new Date(),
      sent: false
    };

    return this.sendNotification(notification);
  }

  /**
   * Send route update notification
   */
  public async sendRouteUpdate(userId: string, routeData: any): Promise<boolean> {
    const notification: CrowdNotification = {
      userId,
      locationId: routeData.locationId || 'route',
      notificationType: NotificationType.ROUTE_UPDATE,
      title: 'Route Updated',
      message: 'Your route has been optimized to avoid crowded areas.',
      data: { routeData },
      timestamp: new Date(),
      sent: false
    };

    return this.sendNotification(notification);
  }

  /**
   * Broadcast alert to all connected users in a specific area
   */
  public async broadcastAreaAlert(coordinates: { latitude: number; longitude: number }, radius: number, alert: CrowdAlert): Promise<number> {
    let sentCount = 0;

    for (const [userId, connection] of this.userConnections) {
      // In a real implementation, you would check if the user is within the radius
      // For now, we'll send to all connected users
      const success = await this.sendCrowdAlert(userId, alert);
      if (success) sentCount++;
    }

    return sentCount;
  }

  /**
   * Create crowd alert based on crowd data
   */
  public createCrowdAlert(crowdData: CrowdDataModel): CrowdAlert {
    let alertType: CrowdAlertType;
    let severity: AlertSeverity;
    let message: string;

    if (crowdData.getOccupancyPercentage() >= 95) {
      alertType = CrowdAlertType.CAPACITY_REACHED;
      severity = AlertSeverity.CRITICAL;
      message = `${crowdData.locationName} has reached capacity. Entry may be restricted.`;
    } else if (crowdData.hasLongWait()) {
      alertType = CrowdAlertType.LONG_WAIT;
      severity = AlertSeverity.HIGH;
      message = `${crowdData.locationName} currently has a wait time of ${crowdData.estimatedWaitTime} minutes.`;
    } else if (crowdData.isOvercrowded()) {
      alertType = CrowdAlertType.HIGH_CROWD;
      severity = AlertSeverity.MEDIUM;
      message = `${crowdData.locationName} is experiencing high crowd levels.`;
    } else {
      alertType = CrowdAlertType.CROWD_INCREASING;
      severity = AlertSeverity.LOW;
      message = `Crowd levels at ${crowdData.locationName} are increasing.`;
    }

    return {
      id: `alert-${crowdData.locationId}-${Date.now()}`,
      locationId: crowdData.locationId,
      alertType,
      message,
      severity,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
      alternatives: []
    };
  }

  /**
   * Send notification to user
   */
  private async sendNotification(notification: CrowdNotification): Promise<boolean> {
    const connection = this.userConnections.get(notification.userId);

    if (!connection || connection.readyState !== WebSocket.OPEN) {
      // Queue notification for later delivery
      this.notificationQueue.push(notification);
      return false;
    }

    try {
      const message = JSON.stringify({
        type: 'notification',
        notification
      });

      connection.send(message);
      notification.sent = true;
      
      console.log(`Notification sent to user ${notification.userId}: ${notification.title}`);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      this.notificationQueue.push(notification);
      return false;
    }
  }

  /**
   * Get alert title based on alert type
   */
  private getAlertTitle(alertType: CrowdAlertType): string {
    switch (alertType) {
      case CrowdAlertType.HIGH_CROWD:
        return 'High Crowd Alert';
      case CrowdAlertType.LONG_WAIT:
        return 'Long Wait Time';
      case CrowdAlertType.CAPACITY_REACHED:
        return 'Capacity Reached';
      case CrowdAlertType.CROWD_INCREASING:
        return 'Crowd Increasing';
      default:
        return 'Crowd Alert';
    }
  }

  /**
   * Process queued notifications
   */
  public async processQueuedNotifications(): Promise<void> {
    const toProcess = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of toProcess) {
      const success = await this.sendNotification(notification);
      if (!success) {
        // If still can't send, check if notification is not too old
        const age = Date.now() - notification.timestamp.getTime();
        if (age < 30 * 60 * 1000) { // Less than 30 minutes old
          this.notificationQueue.push(notification);
        }
      }
    }
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.userConnections.size;
  }

  /**
   * Close WebSocket server
   */
  public close(): void {
    this.wss.close();
  }
}