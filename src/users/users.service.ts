import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemRole as Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService
  ) {}

  private async createAuditLog(action: string, performedById: string, details: any) {
    await this.auditLogService.createLog({
      action,
      performedById,
      details,
    });
  }

  async createUser(creatorId: string, creatorRole: Role, data: CreateUserDto) {
    const { email, name, roleId, status } = data;
    
    const targetRole = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!targetRole) {
      throw new NotFoundException('Role not found.');
    }

    if (creatorRole !== Role.SUPER_ADMIN && (targetRole.name === 'SUPER_ADMIN' || targetRole.name === 'ADMIN')) {
      throw new ForbiddenException('Only Super Admins can create Admins or Super Admins.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already in use.');
    }

    // Set default temporary password
    const temporaryPassword = 'Welcome@123';
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    let systemRole: Role = Role.CUSTOMER;
    if (targetRole.name === 'SUPER_ADMIN') systemRole = Role.SUPER_ADMIN;
    else if (targetRole.name === 'ADMIN') systemRole = Role.ADMIN;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        systemRole,
        roleId,
        status: status || UserStatus.ACTIVE,
        mustChangePassword: true,
      },
      include: {
        role: true
      }
    });

    const action = (user.systemRole === Role.ADMIN || user.systemRole === Role.SUPER_ADMIN) ? 'CREATE_ADMIN' : 'CREATE_USER';
    await this.createAuditLog(action, creatorId, { targetUserId: user.id, targetUserEmail: user.email, role: user.role?.name });

    const { passwordHash: _, systemRole: __, roleId: ___, ...result } = user;
    return {
      ...result,
      role: user.role ? { id: user.role.id, name: user.role.name } : null
    };
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as any } },
        { email: { contains: search, mode: 'insensitive' as any } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          role: true
        }
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(user => {
        const { passwordHash, systemRole, roleId, ...safeUser } = user;
        return {
          ...safeUser,
          role: user.role ? { id: user.role.id, name: user.role.name } : null
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true
      }
    });
    if (!user) throw new NotFoundException('User not found.');
    const { passwordHash, systemRole, roleId, ...result } = user;
    return {
      ...result,
      role: user.role ? { id: user.role.id, name: user.role.name } : null
    };
  }

  async updateUser(updaterId: string, updaterRole: Role, id: string, data: UpdateUserDto) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    if (updaterRole !== Role.SUPER_ADMIN && targetUser.systemRole === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot update a Super Admin unless you are a Super Admin.');
    }

    const updateData: any = { ...data };
    let targetRoleName = '';
    if (data.roleId) {
      const targetRole = await this.prisma.role.findUnique({ where: { id: data.roleId } });
      if (!targetRole) {
        throw new NotFoundException('Role not found.');
      }
      if (updaterRole !== Role.SUPER_ADMIN && (targetRole.name === 'SUPER_ADMIN' || targetRole.name === 'ADMIN')) {
        throw new ForbiddenException('Only Super Admins can assign Admin or Super Admin roles.');
      }
      targetRoleName = targetRole.name;
      let systemRole: Role = Role.CUSTOMER;
      if (targetRole.name === 'SUPER_ADMIN') systemRole = Role.SUPER_ADMIN;
      else if (targetRole.name === 'ADMIN') systemRole = Role.ADMIN;
      updateData.systemRole = systemRole;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true
      }
    });

    if (data.status && data.status !== targetUser.status) {
      const action = data.status === 'ACTIVE' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER';
      await this.createAuditLog(action, updaterId, { targetUserId: id, targetUserEmail: targetUser.email });
    }
    
    if (data.roleId && data.roleId !== targetUser.roleId) {
      const oldRole = targetUser.roleId ? (await this.prisma.role.findUnique({ where: { id: targetUser.roleId } }))?.name : targetUser.systemRole;
      await this.createAuditLog('CHANGE_USER_ROLE', updaterId, {
        targetUserId: id,
        targetUserEmail: targetUser.email,
        oldRole,
        newRole: targetRoleName,
      });
    }

    const isGeneralUpdate = (data.name && data.name !== targetUser.name) || (data.email && data.email !== targetUser.email);
    if (isGeneralUpdate) {
      await this.createAuditLog('UPDATE_USER', updaterId, {
        targetUserId: id,
        targetUserEmail: targetUser.email,
        changes: { name: data.name, email: data.email },
      });
    }

    const { passwordHash, systemRole: _, roleId: __, ...result } = updatedUser;
    return {
      ...result,
      role: updatedUser.role ? { id: updatedUser.role.id, name: updatedUser.role.name } : null
    };
  }

  async removeUser(deleterId: string, deleterRole: Role, id: string) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    if (deleterRole !== Role.SUPER_ADMIN && (targetUser.systemRole === Role.ADMIN || targetUser.systemRole === Role.SUPER_ADMIN)) {
      throw new ForbiddenException('Only Super Admins can delete Admins or Super Admins.');
    }

    await this.prisma.user.delete({ where: { id } });
    
    const action = (targetUser.systemRole === Role.ADMIN || targetUser.systemRole === Role.SUPER_ADMIN) ? 'DELETE_ADMIN' : 'DELETE_USER';
    await this.createAuditLog(action, deleterId, { targetUserId: id, targetUserEmail: targetUser.email });

    return { message: 'User successfully deleted.' };
  }
  async updatePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      }
    });
  }
}
