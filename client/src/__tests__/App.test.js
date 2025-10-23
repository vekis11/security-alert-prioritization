import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the contexts
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn()
  })
}));

jest.mock('../contexts/SocketContext', () => ({
  SocketProvider: ({ children }) => children,
  useSocket: () => ({
    socket: null,
    connected: false,
    alerts: [],
    notifications: []
  })
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ children }) => <div data-testid="route">{children}</div>,
  Navigate: () => <div data-testid="navigate">Navigate</div>
}));

// Mock react-query
jest.mock('react-query', () => ({
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }) => children
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });

  it('renders the main app structure', () => {
    render(<App />);
    expect(screen.getByTestId('router')).toBeInTheDocument();
    expect(screen.getByTestId('routes')).toBeInTheDocument();
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('has proper CSS classes', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toHaveClass('App');
  });
});
