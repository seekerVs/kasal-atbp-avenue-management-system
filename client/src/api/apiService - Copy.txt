// client/src/api/apiService.ts
import api from '../services/api';
import { User } from '../types'; // Import your types

// Define specific types for creating/updating data to be more precise
type UserCreationData = Omit<User, '_id' | 'createdAt'>;
type UserUpdateData = Partial<UserCreationData>;

// --- User Management ---
export const fetchUsers = async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
};

export const createUser = async (userData: UserCreationData): Promise<User> => {
    const response = await api.post('/users', userData);
    return response.data;
};

export const updateUser = async (userId: string, userData: UserUpdateData): Promise<User> => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
};

export const deleteUser = async (userId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
};
