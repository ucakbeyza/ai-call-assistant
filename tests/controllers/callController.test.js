const request = require('supertest');
const app = require('../../src/app');
const Call = require('../../src/models/Call');

describe('Call Controller', () => {
  let token;

  beforeEach(async () => {
    const userData = {
      username: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: '123456'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    token = response.body.data.token;
  });

  describe('POST /api/calls', () => {
    it('should create a new call', async () => {
      const callData = {
        title: 'Test Meeting',
        participants: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            role: 'host'
          }
        ],
        notes: 'Test meeting notes'
      };

      const response = await request(app)
        .post('/api/calls')
        .set('Authorization', `Bearer ${token}`)
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(callData.title);
    });

    it('should not create call without title', async () => {
      const callData = {
        participants: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            role: 'host'
          }
        ]
      };

      const response = await request(app)
        .post('/api/calls')
        .set('Authorization', `Bearer ${token}`)
        .send(callData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title is required');
    });
  });

  describe('GET /api/calls', () => {
    beforeEach(async () => {
      const callData = {
        title: 'Test Meeting',
        participants: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            role: 'host'
          }
        ]
      };

      await request(app)
        .post('/api/calls')
        .set('Authorization', `Bearer ${token}`)
        .send(callData);
    });

    it('should get all calls', async () => {
      const response = await request(app)
        .get('/api/calls')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should get calls with pagination', async () => {
      const response = await request(app)
        .get('/api/calls?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.count).toBe(1);
    });
  });

  describe('GET /api/calls/:id/transcription', () => {
    let callId;

    beforeEach(async () => {
      const callData = {
        title: 'Test Meeting',
        participants: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            role: 'host'
          }
        ]
      };

      const response = await request(app)
        .post('/api/calls')
        .set('Authorization', `Bearer ${token}`)
        .send(callData);

      callId = response.body.data._id;
    });

    it('should get transcription status', async () => {
      const response = await request(app)
        .get(`/api/calls/${callId}/transcription`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.callId).toBe(callId);
      expect(response.body.data.transcriptionStatus).toBeDefined();
    });
  });
});