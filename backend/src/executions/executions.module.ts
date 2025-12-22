import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { Execution, ExecutionSchema } from './schemas/execution.schema';
import { ExecutionGateway } from './gateways/execution.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'fallback-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
    ]),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, ExecutionGateway],
  exports: [ExecutionsService, ExecutionGateway],
})
export class ExecutionsModule {}


