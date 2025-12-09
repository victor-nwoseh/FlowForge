import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionsService } from './connections.service';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  async findAll(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID missing from request context');
    }

    const connections = await this.connectionsService.findAllByUser(userId);
    return connections ?? [];
  }

  @Delete(':service')
  async remove(@Request() req: any, @Param('service') service: string) {
    const userId = req.user?.id ?? req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID missing from request context');
    }

    if (!['slack', 'google'].includes(service)) {
      throw new BadRequestException('Invalid service. Must be slack or google.');
    }

    const deleted = await this.connectionsService.delete(userId, service);

    if (!deleted) {
      throw new NotFoundException(`${service} connection not found`);
    }

    return { message: `${service} connection removed`, success: true };
  }
}

