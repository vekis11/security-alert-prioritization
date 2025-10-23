// Jest setup file
const { TextEncoder, TextDecoder } = require('util');

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/security-dashboard-test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock external services
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response'
            }
          }]
        })
      }
    }
  }))
}));

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ok: true })
    }
  }))
}));

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    readyState: 1,
    close: jest.fn()
  },
  Schema: jest.fn(),
  model: jest.fn()
}));

// Set test timeout
jest.setTimeout(10000);
