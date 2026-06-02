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
  async createAutomationBlueprint(@Body() payload: any) {
    // Passes processing safely to our database service layer mapping hooks
    return this.scheduledTasksService.create(payload);
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
