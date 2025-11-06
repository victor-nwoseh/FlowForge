import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      message: 'FlowForge API is running',
      version: '1.0.0',
    };
  }
}

