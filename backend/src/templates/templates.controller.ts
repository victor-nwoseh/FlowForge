import { Controller, Get, Param, Query } from '@nestjs/common';

import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.templatesService.findAll(category);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.templatesService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }
}

