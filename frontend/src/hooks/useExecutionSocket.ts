import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

type Progress = {
  completed: number;
  total: number;
  percentage: number;
};

const SOCKET_URL = 'http://localhost:3001';

const useExecutionSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const authToken = useAuthStore((state) => state.token) || localStorage.getItem('flowforge_token') || localStorage.getItem('token');
  const [executionStarted, setExecutionStarted] = useState<any>(null);
  const [nodeCompleted, setNodeCompleted] = useState<any>(null);
  const [executionCompleted, setExecutionCompleted] = useState<any>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    if (!authToken) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('execution:started', (data) => setExecutionStarted(data));
    newSocket.on('execution:node-completed', (data) => setNodeCompleted(data));
    newSocket.on('execution:completed', (data) => setExecutionCompleted(data));
    newSocket.on('execution:progress', (data) => setProgress(data));

    newSocket.on('connect', () => console.log('WebSocket connected'));
    newSocket.on('disconnect', () => console.log('WebSocket disconnected'));
    newSocket.on('error', (error) => console.error('WebSocket error:', error));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authToken]);

  return {
    socket,
    executionStarted,
    nodeCompleted,
    executionCompleted,
    progress,
  };
};

export default useExecutionSocket;

