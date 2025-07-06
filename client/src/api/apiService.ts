import axios from 'axios';
import { User } from '../types'; // Adjust path if needed, or use '@' alias

// Get the backend URL from Vite's environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create a configured instance of axios
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Axios Request Interceptor to automatically add the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Type definitions for function parameters ---
type CreateUserData = Omit<User, '_id' | 'createdAt' | 'updatedAt'> & { password?: string };
type UpdateUserData = Partial<Omit<User, '_id' | 'createdAt' | 'updatedAt'>>;

// --- API Function Exports ---

// Fetches all users
export const fetchUsers = async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data;
};

// Creates a new user
export const createUser = async (userData: CreateUserData): Promise<User> => {
    const { data } = await api.post('/users', userData);
    return data;
};

// Updates an existing user
export const updateUser = async (id: string, userData: UpdateUserData): Promise<User> => {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
};

// Add other API functions (login, packages, etc.) here...

export default api;