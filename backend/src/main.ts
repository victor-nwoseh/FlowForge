import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173',
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
  console.log(`FlowForge backend is running on port ${port}`);
}

bootstrap();

