import { create } from 'zustand';
import { User } from '../types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  initAuth: () => void;
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setAuth: (token, user) => {
    localStorage.setItem('flowforge_token', token);
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('flowforge_token');
    set({ ...initialState });
  },
  initAuth: () => {
    const token = localStorage.getItem('flowforge_token');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },
}));

export default useAuthStore;

