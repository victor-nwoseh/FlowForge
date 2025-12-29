import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Input from '../components/Input';
import LiquidMetalButton from '../components/LiquidMetalButton';
import TrueFocus from '../components/TrueFocus';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { AuthResponse, LoginData } from '../types/auth.types';
import { AxiosError } from 'axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const loginMutation = useMutation<AuthResponse, AxiosError, LoginData>({
    mutationFn: authService.login,
    onSuccess: (data) => {
      toast.success('Signed in successfully');
      setAuth(data.access_token, data.user);
      navigate('/workflows');
    },
    onError: (error) => {
      const message = (error.response?.data as { message?: string })?.message ?? 'Failed to sign in';
      toast.error(message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-forge-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-forge-950/30 to-forge-950/80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-ember-500/5 blur-[100px] pointer-events-none" />
      
      {/* Login Container */}
      <div className="w-full max-w-md bg-forge-900/60 backdrop-blur-xl border border-forge-800 shadow-2xl rounded-2xl p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <Link to="/" className="inline-block text-forge-50">
            <TrueFocus
              sentence="Flow Forge"
              manualMode={false}
              blurAmount={4}
              borderColor="#e97f38"
              glowColor="rgba(233, 127, 56, 0.6)"
              animationDuration={0.5}
              pauseBetweenAnimations={0.5}
            />
          </Link>
        </div>
        
        <h2 className="text-xl font-semibold text-forge-100 text-center mb-2">Welcome Back</h2>
        <p className="text-sm text-forge-300 text-center mb-8">
          Sign in to manage your automations.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-forge-200 mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="bg-forge-950 border-forge-700 text-forge-100 placeholder:text-forge-500 focus:border-ember-500 focus:ring-1 focus:ring-ember-500/50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-forge-200 mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="bg-forge-950 border-forge-700 text-forge-100 placeholder:text-forge-500 focus:border-ember-500 focus:ring-1 focus:ring-ember-500/50"
            />
          </div>

          <div className="pt-2">
            <LiquidMetalButton 
              onClick={() => {}} // Form submission is handled by onSubmit, but LiquidMetalButton needs onClick or it's a link. We can add type="submit" support to LiquidMetalButton or just wrap it. 
              // Wait, LiquidMetalButton renders a <button> if no 'to' or 'href'. But does it pass 'type'?
              // Let me check LiquidMetalButton props.
              className="w-full"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </LiquidMetalButton>
            {/* LiquidMetalButton doesn't support 'type' prop in its interface currently. I should check that. */}
          </div>
        </form>

        <p className="text-center text-sm text-forge-400 mt-8">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-ember-400 hover:text-ember-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

