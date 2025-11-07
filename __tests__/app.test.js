const request = require('supertest');
const app = require('../server/server.js');

describe('Express App Tests', () => {
    // Health check test
    it('GET /health should return 200', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
    });

    // Test JSON middleware
    it('POST request with JSON should parse body', async () => {
        const response = await request(app)
            .post('/health')
            .send({ test: 'data' })
            .set('Content-Type', 'application/json');
        expect(response.statusCode).toBe(404); // Default 404 for undefined route
    });

    // Test CORS headers
    it('Response should include CORS headers', async () => {
        const response = await request(app).get('/health');
        expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
});

// const request = require('supertest');
// const app = require('../server/server.js');  // Update this line to point to your server file

// describe('Express App Tests', () => {
//   it('GET /health should return 200', async () => {
//     const response = await request(app).get('/health');
//     expect(response.statusCode).toBe(200);
//   });
// });

