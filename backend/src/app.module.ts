import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ExecutionsModule } from './executions/executions.module';
import { ConnectionsModule } from './connections/connections.module';
import { SchedulesModule } from './schedules/schedules.module';
import { TemplatesModule } from './templates/templates.module';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/flowforge';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(mongoUri),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    UsersModule,
    AuthModule,
    WorkflowsModule,
    ExecutionsModule,
    ConnectionsModule,
    SchedulesModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

