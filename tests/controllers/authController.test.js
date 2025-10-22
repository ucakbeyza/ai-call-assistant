const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'Test User',
        email: 'test@example.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      const userData = {
        username: 'Test User',
        email: 'test@example.com',
        password: '123456'
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already in use');
    });

    it('should not register user with missing fields', async () => {
      const userData = {
        username: 'Test User'
        // Missing email and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const userData = {
        username: 'Test User',
        email: 'test@example.com',
        password: '123456'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const userData = {
        username: 'Test User',
        email: 'test@example.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      token = response.body.data.token;
    });

    it('should get user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('Test User');
    });

    it('should not get user info without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});