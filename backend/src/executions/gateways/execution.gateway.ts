import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class ExecutionGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ExecutionGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  onModuleInit(): void {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth as any)?.token ||
      (client.handshake.headers.authorization as string | undefined);

    if (!token) {
      this.logger.error('Invalid authentication for socket connection: missing token');
      client.disconnect();
      return;
    }

    try {
      const decoded: any = this.jwtService.verify(token);
      const userId = decoded?.userId || decoded?.sub;

      if (!userId) {
        this.logger.error('Invalid authentication for socket connection: no userId in token');
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.join(userId);
      this.logger.log(`User ${userId} connected to WebSocket`);
    } catch (err) {
      this.logger.error('Invalid authentication for socket connection', err as any);
      client.disconnect();
    }
  }

  emitExecutionStarted(executionId: string, workflowId: string, userId: string): void {
    this.server
      ?.to(userId)
      .emit('execution:started', { executionId, workflowId, timestamp: new Date() });
    this.logger.log(`Emitted execution:started for ${executionId}`);
  }

  emitNodeCompleted(
    executionId: string,
    nodeId: string,
    nodeType: string,
    status: 'success' | 'failed',
    userId: string,
  ): void {
    this.server
      ?.to(userId)
      .emit('execution:node-completed', {
        executionId,
        nodeId,
        nodeType,
        status,
        timestamp: new Date(),
      });
  }

  emitExecutionCompleted(
    executionId: string,
    status: 'success' | 'failed',
    userId: string,
  ): void {
    this.server
      ?.to(userId)
      .emit('execution:completed', { executionId, status, timestamp: new Date() });
  }

  emitExecutionProgress(
    executionId: string,
    completed: number,
    total: number,
    userId: string,
  ): void {
    this.server?.to(userId).emit('execution:progress', {
      executionId,
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    });
  }
}

