import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(35, 31, 28, 0.95)',
              color: '#f5f2ef',
              border: '1px solid rgba(46, 41, 36, 0.5)',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#231f1c',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#231f1c',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

