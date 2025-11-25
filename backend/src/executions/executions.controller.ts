import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionsService } from './executions.service';

@UseGuards(JwtAuthGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  getExecutions(@Request() req: any, @Query('workflowId') workflowId?: string) {
    return this.executionsService.findAll(req.user.id, workflowId);
  }

  @Get(':id')
  getExecution(@Param('id') id: string, @Request() req: any) {
    return this.executionsService.findOne(id, req.user.id);
  }
}


