const request = require('supertest');
const path = require('path');
const app = require('../server/server.js');

describe('Integration Tests for Dashboard App', () => {
    it('GET /health should return 200', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
    });

    const path = require('path');
const filePath = path.join(__dirname, 'fixtures', 'sample.csv');

it('POST /upload should handle file uploads', async () => {
  const res = await request(app)
    .post('/upload')
    .attach('file', filePath);
  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveProperty('ok', true);
});

    // Add more tests for other endpoints and functionalities as needed
});

describe('Dashboard Integration Tests', () => {
    it('should process uploaded CSV data', async () => {
        const response = await request(app)
            .post('/upload')
            .attach('file', '__tests__/fixtures/sample.csv')
            .expect(200);
        
        const stats = await request(app)
            .get(`/stats/${response.body.filename}`)
            .expect(200);
        
        expect(stats.body).toHaveProperty('columnStats');
    });
});