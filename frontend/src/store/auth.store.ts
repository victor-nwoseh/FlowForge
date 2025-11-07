import { create } from 'zustand';
import { User } from '../types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  initAuth: () => void;
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setAuth: (token, user) => {
    localStorage.setItem('flowforge_token', token);
    set({ token, user, isAuthenticated: true, isInitialized: true });
  },
  logout: () => {
    localStorage.removeItem('flowforge_token');
    set({ ...initialState, isInitialized: true });
  },
  initAuth: () => {
    const token = localStorage.getItem('flowforge_token');
    if (token) {
      set({ token, isAuthenticated: true, isInitialized: true });
      return;
    }
    set({ isInitialized: true });
  },
}));

export default useAuthStore;

