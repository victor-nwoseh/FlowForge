import api from './api';
import {
  AuthResponse,
  LoginData,
  RegisterData,
  User,
} from '../types/auth.types';

export const authService = {
  register: (data: RegisterData) => api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginData) => api.post<AuthResponse>('/auth/login', data),
  getProfile: () => api.get<User>('/auth/profile'),
  logout: () => {
    localStorage.removeItem('flowforge_token');
    window.location.href = '/login';
  },
};

export default authService;

