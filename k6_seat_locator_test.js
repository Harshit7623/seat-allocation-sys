import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    // Stress testing configuration
    stages: [
        { duration: '30s', target: 50 },  // Ramp-up to 50 active users
        { duration: '1m', target: 150 },  // Ramp-up to 150 active users (stress)
        { duration: '1m', target: 150 },  // Stay at 150 active users
        { duration: '30s', target: 0 },   // Ramp-down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests must complete within 1000ms
        http_req_failed: ['rate<0.01'],    // Error rate should be less than 1%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';

export default function () {
    // 1. Test Home Page Load
    let homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage load time < 500ms': (r) => r.timings.duration < 500,
    });
    
    // Simulate user reading the page
    sleep(Math.random() * 2 + 1); // sleep between 1-3 seconds

    // 2. Test Search Functionality with REAL test data (Cache Hit & Matrix render)
    // We extracted real data from PLAN-0GF9616N.json (Date: 03-25-2026, Slot: 02:00-05:00)
    const realStudents = [
        'BTCS24O1001', 'BTCS24O1011', 'BTCS24O1020', 'BTCS24O1029', 'BTCS24O1038', 
        'BTCS24O1002', 'BTCS24O1012', 'BTCS24O1021', 'BTCS24O1030', 'BTCS24O1039', 
        'BTCS24O1003', 'BTCS24O1013', 'BTCS24O1022', 'BTCS24O1031', 'BTCS24O1040', 
        'BTCS24O1004', 'BTCS24O1014', 'BTCS24O1023', 'BTCS24O1032', 'BTCS24O1041'
    ];
    
    // Pick a random student from the real list
    const randomEnrollment = realStudents[Math.floor(Math.random() * realStudents.length)];
    
    const searchPayload = {
        enrollment: randomEnrollment, 
        exam_date: '2026-03-25',      // Real date from cache
        time_slot: '02:00-05:00'      // Real time slot from cache
    };

    let searchRes = http.post(`${BASE_URL}/search`, searchPayload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        tags: { my_custom_tag: 'search_query' }
    });

    check(searchRes, {
        // Seat-locator might return 200 (rendered HTML) or redirect if form inputs are missing
        'search request handled (200 or 302)': (r) => r.status === 200 || r.status === 302,
    });

    // Simulate think time before searching again
    sleep(Math.random() * 2 + 1);
}
