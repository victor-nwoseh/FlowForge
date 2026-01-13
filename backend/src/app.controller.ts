import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

@Controller()
export class AppController {
  private redisClient: Redis;

  constructor(@InjectConnection() private readonly mongoConnection: Connection) {
    // Create Redis client for health checks
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });
  }

  @Get()
  getRoot() {
    return {
      message: 'FlowForge API is running',
      version: '1.0.0',
    };
  }

  @Get('health')
  async getHealth() {
    const health = {
      status: 'ok' as 'ok' | 'degraded',
      timestamp: new Date().toISOString(),
      service: 'flowforge-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      mongodb: 'disconnected' as 'connected' | 'disconnected',
      redis: 'disconnected' as 'connected' | 'disconnected',
    };

    // Check MongoDB connection (readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
    health.mongodb = this.mongoConnection.readyState === 1 ? 'connected' : 'disconnected';

    // Check Redis connection
    try {
      await this.redisClient.ping();
      health.redis = 'connected';
    } catch {
      health.redis = 'disconnected';
    }

    // Determine overall status
    if (health.mongodb === 'disconnected' || health.redis === 'disconnected') {
      health.status = 'degraded';
      throw new HttpException(health, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}

