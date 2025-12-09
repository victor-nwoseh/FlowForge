import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { ConnectionsService } from './connections.service';
import { Connection, ConnectionSchema } from './schemas/connection.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Connection.name, schema: ConnectionSchema }]),
  ],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}

