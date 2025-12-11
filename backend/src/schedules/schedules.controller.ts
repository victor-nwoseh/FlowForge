import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    const { workflowId, cronExpression } = body || {};

    if (!workflowId || !cronExpression) {
      throw new BadRequestException('workflowId and cronExpression are required');
    }

    return this.schedulesService.create(userId, workflowId, cronExpression);
  }

  @Get()
  async findAll(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.schedulesService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.schedulesService.findOne(id, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    await this.schedulesService.delete(id, userId);
    return { message: 'Schedule deleted successfully' };
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    const { isActive } = body ?? {};

    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }

    return this.schedulesService.toggle(id, userId, isActive);
  }
}

