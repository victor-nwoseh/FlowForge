import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { ConnectionsService } from './connections.service';
import { Connection, ConnectionSchema } from './schemas/connection.schema';
import { ConnectionsController } from './connections.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Connection.name, schema: ConnectionSchema }]),
  ],
  providers: [ConnectionsService],
  controllers: [ConnectionsController],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}

