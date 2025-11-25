import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { Execution, ExecutionSchema } from './schemas/execution.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
    ]),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}


