import axios from 'axios';

// Centralized Axios client instance
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ REQUEST INTERCEPTOR: Inject Bearer token on every outgoing request
api.interceptors.request.use(
  (config) => {
    // 'jwt_token' is the key set by AuthContext.tsx on login
    const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token') || localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No authorization token found in storage!');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ RESPONSE INTERCEPTOR: Handle 401 globally — clear stale token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
      if (!isLoginPage) {
        console.warn('🔒 Session expired or invalid token. Redirecting to login...');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
