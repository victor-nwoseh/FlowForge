import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="flex gap-8">
        <Link
          to="/login"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Login
        </Link>
        <Link
          to="/register"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;

