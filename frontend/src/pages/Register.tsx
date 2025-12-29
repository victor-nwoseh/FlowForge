import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Input from '../components/Input';
import LiquidMetalButton from '../components/LiquidMetalButton';
import TrueFocus from '../components/TrueFocus';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { RegisterData, AuthResponse } from '../types/auth.types';
import { AxiosError } from 'axios';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const registerMutation = useMutation<AuthResponse, AxiosError, RegisterData>({
    mutationFn: authService.register,
    onSuccess: (data) => {
      toast.success('Account created successfully!');
      setAuth(data.access_token, data.user);
      navigate('/workflows');
    },
    onError: (error) => {
      const message = (error.response?.data as { message?: string })?.message ?? 'Failed to create account';
      toast.error(message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    registerMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-forge-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-forge-950/30 to-forge-950/80 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[800px] h-[400px] rounded-full bg-ember-500/5 blur-[100px] pointer-events-none" />
      
      {/* Register Container */}
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

        <h2 className="text-xl font-semibold text-forge-100 text-center mb-2">Create Account</h2>
        <p className="text-sm text-forge-300 text-center mb-8">
          Start building powerful automations with FlowForge.
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
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="bg-forge-950 border-forge-700 text-forge-100 placeholder:text-forge-500 focus:border-ember-500 focus:ring-1 focus:ring-ember-500/50"
            />
          </div>

          <div className="pt-2">
            <LiquidMetalButton 
              onClick={() => {}} 
              className="w-full"
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
            </LiquidMetalButton>
          </div>
        </form>

        <p className="text-center text-sm text-forge-400 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-ember-400 hover:text-ember-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

