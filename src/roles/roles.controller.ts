import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('ROLE_VIEW')
  async getRoles() {
    return this.rolesService.getRoles();
  }

  @Post()
  @Permissions('ROLE_CREATE')
  async createRole(@Req() req, @Body() body: CreateRoleDto) {
    const creatorId = req.user.id;
    return this.rolesService.createRole(creatorId, body);
  }

  @Patch(':id')
  @Permissions('ROLE_UPDATE')
  async updateRole(@Req() req, @Param('id') id: string, @Body() body: UpdateRoleDto) {
    const updaterId = req.user.id;
    return this.rolesService.updateRole(updaterId, id, body);
  }

  @Delete(':id')
  @Permissions('ROLE_DELETE')
  async deleteRole(@Req() req, @Param('id') id: string) {
    const deleterId = req.user.id;
    return this.rolesService.deleteRole(deleterId, id);
  }

  @Patch(':id/permissions')
  @Permissions('ROLE_ASSIGN')
  async assignPermissions(@Req() req, @Param('id') id: string, @Body() body: AssignPermissionsDto) {
    const updaterId = req.user.id;
    return this.rolesService.assignPermissions(updaterId, id, body);
  }
}
