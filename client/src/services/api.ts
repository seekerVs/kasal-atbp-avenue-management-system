import axios from 'axios';

// 1. Access the environment variable using `import.meta.env`
const API_BASE_URL = import.meta.env.VITE_API_URL;

// 2. (Optional but Recommended) Add a check to ensure the variable is set
if (!API_BASE_URL) {
  throw new Error("VITE_API_URL is not defined. Please check your .env file.");
}

// 3. Create a pre-configured instance of axios
const api = axios.create({
  baseURL: API_BASE_URL,
});

// 4. (Optional but Recommended) Add an interceptor to attach your auth token
// This automatically adds the token to every request if it exists.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});


// 5. Export the configured instance as the default
export default api;