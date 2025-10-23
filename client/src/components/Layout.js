import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  HomeIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ChartBarIcon,
  BellIcon,
  UserIcon,
  LogoutIcon,
  MenuIcon,
  XIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import NotificationPanel from './NotificationPanel';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, clearAllNotifications } = useSocket();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Alerts', href: '/alerts', icon: ExclamationTriangleIcon },
    { name: 'Integrations', href: '/integrations', icon: CogIcon },
    { name: 'AI Insights', href: '/ai-insights', icon: LightBulbIcon },
    { name: 'Settings', href: '/settings', icon: ChartBarIcon },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent navigation={navigation} isActive={isActive} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={navigation} isActive={isActive} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center min-w-0">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                <h1 className="ml-2 text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  Security Dashboard
                </h1>
              </div>
            </div>
            
            <div className="ml-4 flex items-center lg:ml-6">
              {/* Notifications */}
              <div className="relative">
                <button
                  className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {notificationOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    onClose={() => setNotificationOpen(false)}
                    onClearAll={clearAllNotifications}
                  />
                )}
              </div>

              {/* User menu */}
              <div className="ml-2 lg:ml-3 relative">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="flex items-center">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="ml-2 lg:ml-3 hidden sm:block">
                      <p className="text-sm font-medium text-gray-700 truncate max-w-20 lg:max-w-none">{user?.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1"
                    title="Logout"
                  >
                    <LogoutIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-4 sm:py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({ navigation, isActive }) => (
  <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              isActive(item.href)
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon
              className={`mr-3 flex-shrink-0 h-6 w-6 ${
                isActive(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}
            />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
    
    <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
      <div className="flex items-center">
        <CpuChipIcon className="h-6 w-6 text-gray-400" />
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-700">AI-Powered</p>
          <p className="text-xs text-gray-500">Security Analytics</p>
        </div>
      </div>
    </div>
  </div>
);

export default Layout;
