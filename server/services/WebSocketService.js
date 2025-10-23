const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const winston = require('winston');

class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
    
    this.connectedUsers = new Map();
    this.userRooms = new Map();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        socket.username = decoded.username;
        
        next();
      } catch (error) {
        this.logger.error('WebSocket authentication failed:', error.message);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info(`User ${socket.username} connected via WebSocket`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        username: socket.username,
        role: socket.userRole,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      this.userRooms.set(socket.userId, `user_${socket.userId}`);

      // Join user to role-based rooms
      socket.join(`role_${socket.userRole}`);
      
      // Handle subscription to specific data streams
      socket.on('subscribe', (data) => {
        this.handleSubscription(socket, data);
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data) => {
        this.handleUnsubscription(socket, data);
      });

      // Handle real-time collaboration
      socket.on('alert_action', (data) => {
        this.handleAlertAction(socket, data);
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle presence updates
      socket.on('presence_update', (data) => {
        this.handlePresenceUpdate(socket, data);
      });

      // Handle custom events
      socket.on('custom_event', (data) => {
        this.handleCustomEvent(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Successfully connected to Security Dashboard',
        userId: socket.userId,
        role: socket.userRole,
        timestamp: new Date().toISOString()
      });
    });
  }

  handleSubscription(socket, data) {
    const { type, filters = {} } = data;
    
    switch (type) {
      case 'alerts':
        socket.join('alerts_stream');
        this.logger.info(`User ${socket.username} subscribed to alerts stream`);
        break;
      case 'dashboard':
        socket.join('dashboard_stream');
        this.logger.info(`User ${socket.username} subscribed to dashboard stream`);
        break;
      case 'ai_insights':
        socket.join('ai_insights_stream');
        this.logger.info(`User ${socket.username} subscribed to AI insights stream`);
        break;
      case 'notifications':
        socket.join('notifications_stream');
        this.logger.info(`User ${socket.username} subscribed to notifications stream`);
        break;
      case 'integrations':
        socket.join('integrations_stream');
        this.logger.info(`User ${socket.username} subscribed to integrations stream`);
        break;
      case 'critical_alerts':
        if (socket.userRole === 'admin' || socket.userRole === 'analyst') {
          socket.join('critical_alerts_stream');
          this.logger.info(`User ${socket.username} subscribed to critical alerts stream`);
        }
        break;
      default:
        this.logger.warn(`Unknown subscription type: ${type}`);
    }
  }

  handleUnsubscription(socket, data) {
    const { type } = data;
    
    switch (type) {
      case 'alerts':
        socket.leave('alerts_stream');
        break;
      case 'dashboard':
        socket.leave('dashboard_stream');
        break;
      case 'ai_insights':
        socket.leave('ai_insights_stream');
        break;
      case 'notifications':
        socket.leave('notifications_stream');
        break;
      case 'integrations':
        socket.leave('integrations_stream');
        break;
      case 'critical_alerts':
        socket.leave('critical_alerts_stream');
        break;
    }
    
    this.logger.info(`User ${socket.username} unsubscribed from ${type} stream`);
  }

  handleAlertAction(socket, data) {
    const { alertId, action, details } = data;
    
    // Broadcast alert action to relevant users
    this.io.to('alerts_stream').emit('alert_action_broadcast', {
      alertId,
      action,
      details,
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info(`User ${socket.username} performed action ${action} on alert ${alertId}`);
  }

  handleTypingStart(socket, data) {
    const { alertId, field } = data;
    
    socket.to(`alert_${alertId}`).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      field,
      timestamp: new Date().toISOString()
    });
  }

  handleTypingStop(socket, data) {
    const { alertId, field } = data;
    
    socket.to(`alert_${alertId}`).emit('user_stopped_typing', {
      userId: socket.userId,
      username: socket.username,
      field,
      timestamp: new Date().toISOString()
    });
  }

  handlePresenceUpdate(socket, data) {
    const { status, location } = data;
    
    // Update user presence
    if (this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.get(socket.userId).status = status;
      this.connectedUsers.get(socket.userId).location = location;
      this.connectedUsers.get(socket.userId).lastActivity = new Date();
    }
    
    // Broadcast presence update to relevant users
    socket.to(`role_${socket.userRole}`).emit('presence_update', {
      userId: socket.userId,
      username: socket.username,
      status,
      location,
      timestamp: new Date().toISOString()
    });
  }

  handleCustomEvent(socket, data) {
    const { event, payload } = data;
    
    // Broadcast custom event to all connected users
    this.io.emit('custom_event_broadcast', {
      event,
      payload,
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnection(socket, reason) {
    this.logger.info(`User ${socket.username} disconnected: ${reason}`);
    
    // Remove user from connected users
    this.connectedUsers.delete(socket.userId);
    this.userRooms.delete(socket.userId);
    
    // Broadcast user offline status
    socket.to(`role_${socket.userRole}`).emit('user_offline', {
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date().toISOString()
    });
  }

  // Public methods for broadcasting events
  broadcastNewAlert(alert) {
    this.io.to('alerts_stream').emit('new_alert', {
      alert,
      timestamp: new Date().toISOString()
    });
    
    // Send to critical alerts stream if severity is critical
    if (alert.severity === 'critical') {
      this.io.to('critical_alerts_stream').emit('critical_alert', {
        alert,
        timestamp: new Date().toISOString()
      });
    }
    
    this.logger.info(`Broadcasted new alert: ${alert.title}`);
  }

  broadcastAlertUpdate(alert) {
    this.io.to('alerts_stream').emit('alert_updated', {
      alert,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info(`Broadcasted alert update: ${alert.title}`);
  }

  broadcastDashboardStats(stats) {
    this.io.to('dashboard_stream').emit('dashboard_stats', {
      stats,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info('Broadcasted dashboard stats update');
  }

  broadcastAIInsights(insights) {
    this.io.to('ai_insights_stream').emit('ai_insights', {
      insights,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info('Broadcasted AI insights update');
  }

  broadcastNotification(notification) {
    this.io.to('notifications_stream').emit('notification', {
      notification,
      timestamp: new Date().toISOString()
    });
    
    // Send to specific user if specified
    if (notification.userId) {
      this.io.to(`user_${notification.userId}`).emit('personal_notification', {
        notification,
        timestamp: new Date().toISOString()
      });
    }
    
    this.logger.info(`Broadcasted notification: ${notification.title}`);
  }

  broadcastIntegrationStatus(integration) {
    this.io.to('integrations_stream').emit('integration_status', {
      integration,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info(`Broadcasted integration status: ${integration.name}`);
  }

  broadcastSystemStatus(status) {
    this.io.emit('system_status', {
      status,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info('Broadcasted system status update');
  }

  sendToUser(userId, event, data) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      
      this.logger.info(`Sent ${event} to user ${userId}`);
    }
  }

  sendToRole(role, event, data) {
    this.io.to(`role_${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info(`Sent ${event} to role ${role}`);
  }

  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    this.logger.info(`Sent ${event} to room ${room}`);
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.values());
  }

  getUserCount() {
    return this.connectedUsers.size;
  }

  getUsersByRole(role) {
    return Array.from(this.connectedUsers.values()).filter(user => user.role === role);
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  getUserInfo(userId) {
    return this.connectedUsers.get(userId);
  }

  // Health check and monitoring
  getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      connectionsByRole: {
        admin: this.getUsersByRole('admin').length,
        analyst: this.getUsersByRole('analyst').length,
        engineer: this.getUsersByRole('engineer').length,
        viewer: this.getUsersByRole('viewer').length
      },
      activeRooms: Array.from(new Set(Array.from(this.io.sockets.adapter.rooms.keys()))),
      uptime: process.uptime()
    };
  }

  // Cleanup inactive connections
  cleanupInactiveConnections() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [userId, userInfo] of this.connectedUsers.entries()) {
      const timeSinceActivity = now - userInfo.lastActivity;
      
      if (timeSinceActivity > inactiveThreshold) {
        this.logger.info(`Cleaning up inactive connection for user ${userId}`);
        this.connectedUsers.delete(userId);
        this.userRooms.delete(userId);
      }
    }
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Graceful shutdown
  async shutdown() {
    this.logger.info('Shutting down WebSocket service...');
    
    // Notify all connected users
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down. Please refresh the page.',
      timestamp: new Date().toISOString()
    });
    
    // Close all connections
    this.io.close();
    
    this.logger.info('WebSocket service shutdown complete');
  }
}

module.exports = WebSocketService;
