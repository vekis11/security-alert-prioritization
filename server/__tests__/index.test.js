const request = require('supertest');
const { app } = require('../index');

describe('Security Dashboard API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return authentication status', async () => {
      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toHaveProperty('authenticated', false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
        role: 'analyst'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    it('should reject invalid user data', async () => {
      const invalidData = {
        username: '',
        email: 'invalid-email',
        password: '123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const userData = {
        username: 'logintest',
        email: 'logintest@example.com',
        password: 'testpassword123',
        role: 'analyst'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Then login
      const loginData = {
        username: 'logintest',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const invalidData = {
        username: 'nonexistent',
        password: 'wrongpassword'
      };

      await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(401);
    });
  });

  describe('GET /api/alerts', () => {
    it('should return alerts list', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/integrations', () => {
    it('should return integrations list', async () => {
      const response = await request(app)
        .get('/api/integrations')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown-route')
        .expect(404);
    });
  });
});
