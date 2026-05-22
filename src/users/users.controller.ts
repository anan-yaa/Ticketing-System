import { Controller, Post, Get, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('USER_CREATE')
  async create(@Request() req, @Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(req.user.id, req.user.role, createUserDto);
    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  @Get()
  @Permissions('USER_VIEW')
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    const data = await this.usersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
    return {
      success: true,
      message: 'Users fetched successfully',
      data,
    };
  }

  @Get(':id')
  @Permissions('USER_VIEW')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      message: 'User fetched successfully',
      data: user,
    };
  }

  @Patch('me/password')
  async updatePassword(@Request() req, @Body() body: any) {
    await this.usersService.updatePassword(req.user.id, body.newPassword);
    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  @Patch(':id')
  @Permissions('USER_UPDATE')
  async update(@Request() req, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.updateUser(req.user.id, req.user.role, id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Delete(':id')
  @Permissions('USER_DELETE')
  async remove(@Request() req, @Param('id') id: string) {
    await this.usersService.removeUser(req.user.id, req.user.role, id);
    return {
      success: true,
      message: 'User deleted successfully',
      data: {},
    };
  }
}
