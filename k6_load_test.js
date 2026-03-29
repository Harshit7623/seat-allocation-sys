import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Configuration
export const options = {
    stages: [
        { duration: '30s', target: 50 },   // Initial ramp-up to 50 users
        { duration: '1m', target: 150 },   // Stress ramp-up to 150 users
        { duration: '2m', target: 300 },   // Peak stress at 300 VUs
        { duration: '2m', target: 300 },   // Hold peak stress for 2 minutes to find breaking points
        { duration: '1m', target: 0 },     // Ramp-down gracefully to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
        errors: ['rate<0.1'],             // Error rate must be less than 10%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

// Setup phase: Run once to create a test user and get an auth token
export function setup() {
    const uniqueId = Math.floor(Math.random() * 1000000);
    const testUser = {
        username: `k6_testuser_${uniqueId}`,
        email: `k6_test_${uniqueId}@example.com`,
        password: 'password123',
        role: 'developer'
    };

    // Attempt to sign up a test user
    let res = http.post(`${BASE_URL}/auth/signup`, JSON.stringify(testUser), {
        headers: { 'Content-Type': 'application/json' },
    });

    // If already exists, just login (fallback)
    if (res.status !== 200 && res.status !== 201) {
        res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
            email: testUser.email,
            password: testUser.password
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let token = '';
    try {
        const body = JSON.parse(res.body);
        token = body.token || '';
    } catch (e) {
        console.error("Failed to parse token from setup response", res.body);
    }
    
    return { token: token };
}

export default function (data) {
    const token = data.token;
    
    const params = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
    };

    group('Public Endpoints', () => {
        // Health Check
        let healthRes = http.get(`${BASE_URL}/health`);
        let healthSuccess = check(healthRes, {
            'Health endpoint returns 200': (r) => r.status === 200,
            'Backend is reachable': (r) => r.json('status') === 'healthy',
        });
        errorRate.add(!healthSuccess);

        // Roles Reference
        let rolesRes = http.get(`${BASE_URL}/auth/roles`);
        let rolesSuccess = check(rolesRes, {
            'Roles endpoint returns 200': (r) => r.status === 200,
        });
        errorRate.add(!rolesSuccess);
    });

    group('Authenticated Endpoints', () => {
        if (!token) {
            console.warn("Skipping authenticated endpoints due to missing token");
            return;
        }

        // Dashboard Stats
        let statsRes = http.get(`${BASE_URL}/dashboard/stats`, params);
        let statsSuccess = check(statsRes, {
            'Dashboard stats returns 200': (r) => r.status === 200 || r.status === 304, // Depending on caching
        });
        errorRate.add(!statsSuccess);

        // User Profile
        let profileRes = http.get(`${BASE_URL}/auth/profile`, params);
        let profileSuccess = check(profileRes, {
            'Profile returns 200': (r) => r.status === 200,
        });
        errorRate.add(!profileSuccess);
        
        // Allowed Tables View (Admin endpoint check)
        let tablesRes = http.get(`${BASE_URL}/database/table/students?page=1&per_page=10`, params);
        let tablesSuccess = check(tablesRes, {
            'Can read students table returns 200/403/404': (r) => r.status === 200 || r.status === 403 || r.status === 404,
        });
        errorRate.add(!tablesSuccess);
    });

    sleep(1); // Think time between iterations
}

export function teardown(data) {
    // Teardown is executed once at the very end
    // E.g. clean up the test user if needed, but since it's testing, 
    // it's generally fine to leave or wipe via script `clean_old_data.py`
    console.log("Load testing completed.");
}