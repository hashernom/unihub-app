import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['max<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const pages = ['/', '/login', '/register', '/forgot-password'];
  for (const path of pages) {
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`${path} status is 200`]: (r) => r.status === 200,
      [`${path} body contains app-root`]: (r) => r.body.includes('<app-root'),
    });
  }
}
