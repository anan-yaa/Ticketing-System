import { Controller, Get, Post, Patch, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('scheduled-tasks')
export class ScheduledTasksController {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  @Get()
  findAll() {
    return this.scheduledTasksService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.scheduledTasksService.create(data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduledTasksService.remove(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.scheduledTasksService.update(id, data);
  }
}
