// client/src/api/apiService.ts
import api from '../services/api';
import { User, Role, Permission } from '../types'; // Import your types

// Define specific types for creating/updating data to be more precise
type UserCreationData = Omit<User, '_id' | 'createdAt' | 'role'> & { roleId: string; password?: string };
type UserUpdateData = Partial<UserCreationData>;
type RoleData = Omit<Role, '_id' | 'createdAt' | 'updatedAt'>;

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

// --- Role Management ---
export const fetchRoles = async (): Promise<Role[]> => {
    const response = await api.get('/roles');
    return response.data;
};

export const createRole = async (roleData: RoleData): Promise<Role> => {
    const response = await api.post('/roles', roleData);
    return response.data;
};

export const updateRole = async (roleId: string, roleData: Partial<RoleData>): Promise<Role> => {
    const response = await api.put(`/roles/${roleId}`, roleData);
    return response.data;
};

export const deleteRole = async (roleId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/roles/${roleId}`);
    return response.data;
};

// --- Permission Management ---
export const fetchPermissions = async (): Promise<Permission[]> => {
    const response = await api.get('/permissions');
    return response.data;
};