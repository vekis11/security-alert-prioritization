import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socketInstance = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    // Alert events
    socketInstance.on('alert-created', (alert) => {
      console.log('New alert received:', alert);
      setAlerts(prev => [alert, ...prev]);
      
      // Show notification for high priority alerts
      if (alert.priority >= 8) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'alert',
          title: 'New High Priority Alert',
          message: alert.title,
          severity: alert.severity,
          alertId: alert.id,
          timestamp: new Date()
        }]);
      }
    });

    socketInstance.on('alert-updated', (alert) => {
      console.log('Alert updated:', alert);
      setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
    });

    socketInstance.on('alert-notification', (data) => {
      console.log('Alert notification:', data);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'alert-notification',
        title: `Security Alert: ${data.alert.title}`,
        message: `Severity: ${data.severity}`,
        severity: data.severity,
        alertId: data.alert.id,
        timestamp: new Date()
      }]);
    });

    // Integration sync events
    socketInstance.on('integration-sync', (data) => {
      console.log('Integration sync:', data);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'sync',
        title: 'Data Sync Complete',
        message: `${data.integration}: ${data.processed} alerts processed`,
        timestamp: new Date()
      }]);
    });

    socketInstance.on('sync-complete', (data) => {
      console.log('Sync complete:', data);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'sync-complete',
        title: 'Data Synchronization Complete',
        message: `${data.totalProcessed} alerts processed, ${data.totalErrors} errors`,
        timestamp: new Date()
      }]);
    });

    // Prioritization events
    socketInstance.on('prioritization-complete', (data) => {
      console.log('Prioritization complete:', data);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'prioritization',
        title: 'Alert Prioritization Complete',
        message: `${data.alertsProcessed} alerts prioritized`,
        timestamp: new Date()
      }]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = (room) => {
    if (socket) {
      socket.emit('join-room', room);
    }
  };

  const leaveRoom = (room) => {
    if (socket) {
      socket.emit('leave-room', room);
    }
  };

  const emit = (event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value = {
    socket,
    connected,
    alerts,
    notifications,
    joinRoom,
    leaveRoom,
    emit,
    on,
    off,
    dismissNotification,
    clearAllNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
