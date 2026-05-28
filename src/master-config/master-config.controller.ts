import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MasterConfigService } from './master-config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('master-config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MasterConfigController {
  constructor(private readonly configService: MasterConfigService) {}

  // Categories
  @Get('categories')
  async getCategories(@Query('activeOnly') activeOnly?: string) {
    return this.configService.getCategories(activeOnly === 'true');
  }

  @Post('categories')
  @Permissions('MASTER_DATA_UPDATE')
  async createCategory(@Body() dto: CreateConfigDto) {
    console.log("📥 [BACKEND RECEIVED] Incoming request parameters:", dto);
    return this.configService.createCategory(dto);
  }

  @Patch('categories/:id/toggle')
  @Permissions('MASTER_DATA_UPDATE')
  async toggleCategory(@Param('id') id: string) {
    return this.configService.toggleCategory(id);
  }

  // Types
  @Get('types')
  async getTypes(@Query('activeOnly') activeOnly?: string) {
    return this.configService.getTypes(activeOnly === 'true');
  }

  @Post('types')
  @Permissions('MASTER_DATA_UPDATE')
  async createType(@Body() dto: CreateConfigDto) {
    return this.configService.createType(dto);
  }

  @Patch('types/:id/toggle')
  @Permissions('MASTER_DATA_UPDATE')
  async toggleType(@Param('id') id: string) {
    return this.configService.toggleType(id);
  }

  // Assignment Groups
  @Get('groups')
  async getGroups(@Query('activeOnly') activeOnly?: string) {
    return this.configService.getQueues(activeOnly === 'true');
  }

  @Post('groups')
  @Permissions('MASTER_DATA_UPDATE')
  async createGroup(@Body() dto: CreateConfigDto) {
    return this.configService.createQueue(dto);
  }

  @Patch('groups/:id/toggle')
  @Permissions('MASTER_DATA_UPDATE')
  async toggleGroup(@Param('id') id: string) {
    return this.configService.toggleQueue(id);
  }


  @Get('services')
  async getServices(@Query('activeOnly') activeOnly?: string) {
    return this.configService.getServices(activeOnly === 'true');
  }

  @Post('services')
  @Permissions('MASTER_DATA_UPDATE')
  async createService(@Body() dto: CreateConfigDto) {
    return this.configService.createService(dto);
  }

  @Patch('services/:id/toggle')
  @Permissions('MASTER_DATA_UPDATE')
  async toggleService(@Param('id') id: string) {
    return this.configService.toggleService(id);
  }

  @Get('sla-rules')
  async getSlaRules() {
    return this.configService.getSlaRules();
  }

  @Post('sla-rules')
  @Permissions('MASTER_DATA_UPDATE')
  async createSlaRule(@Body() dto: any) {
    return this.configService.createSlaRule(dto);
  }
}
