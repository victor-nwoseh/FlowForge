import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/flowforge';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(mongoUri),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

