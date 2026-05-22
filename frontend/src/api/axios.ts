import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('Frontend Request -> URL:', config.url, '| Auth Header:', config.headers.Authorization);
  return config;
});

export default api;
