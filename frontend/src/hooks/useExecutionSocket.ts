import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

/** Execution progress data emitted by the server */
type Progress = {
  completed: number;
  total: number;
  percentage: number;
};

/** WebSocket server URL - connects to NestJS backend */
const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

/**
 * useExecutionSocket - React hook for real-time workflow execution monitoring.
 *
 * This hook establishes a WebSocket connection to the backend ExecutionGateway
 * and listens for real-time execution events. It enables live progress tracking
 * without polling or page refreshes.
 *
 * Events received:
 * - `execution:started` - When a workflow execution begins
 * - `execution:node-completed` - When each node finishes (success or failure)
 * - `execution:progress` - Periodic progress updates (completed/total nodes)
 * - `execution:completed` - When the entire workflow finishes
 *
 * Authentication:
 * - JWT token is passed in the WebSocket auth handshake
 * - Server validates token and joins user to their private room
 *
 * @example
 * const { executionStarted, nodeCompleted, progress, executionCompleted } = useExecutionSocket();
 *
 * useEffect(() => {
 *   if (nodeCompleted) {
 *     console.log(`Node ${nodeCompleted.nodeId} completed with status: ${nodeCompleted.status}`);
 *   }
 * }, [nodeCompleted]);
 *
 * @returns Object containing socket instance and reactive event data
 */
const useExecutionSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const authToken = useAuthStore((state) => state.token) || localStorage.getItem('flowforge_token') || localStorage.getItem('token');
  const [executionStarted, setExecutionStarted] = useState<any>(null);
  const [nodeCompleted, setNodeCompleted] = useState<any>(null);
  const [executionCompleted, setExecutionCompleted] = useState<any>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  // Initialize WebSocket connection when auth token is available
  useEffect(() => {
    if (!authToken) return;

    // Create Socket.io connection with JWT authentication
    const newSocket = io(SOCKET_URL, {
      auth: { token: authToken }, // JWT passed in handshake for server validation
      transports: ['websocket'],  // Use WebSocket only (skip polling)
      reconnection: true,         // Auto-reconnect on disconnect
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Register event listeners for execution updates
    newSocket.on('execution:started', (data) => setExecutionStarted(data));
    newSocket.on('execution:node-completed', (data) => setNodeCompleted(data));
    newSocket.on('execution:completed', (data) => setExecutionCompleted(data));
    newSocket.on('execution:progress', (data) => setProgress(data));

    // Connection lifecycle logging
    newSocket.on('connect', () => console.log('WebSocket connected'));
    newSocket.on('disconnect', () => console.log('WebSocket disconnected'));
    newSocket.on('error', (error) => console.error('WebSocket error:', error));

    setSocket(newSocket);

    // Cleanup: disconnect socket when component unmounts or token changes
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

