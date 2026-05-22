import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async createRole(creatorId: string, data: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new BadRequestException('Role name must be unique.');
    }
    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
      },
    });
    await this.auditLogService.createLog({
      action: 'ROLE_CREATE',
      performedById: creatorId,
      details: { roleId: role.id, name: role.name, description: role.description },
    });
    return role;
  }

  async updateRole(updaterId: string, id: string, data: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    if (role.name === 'SUPER_ADMIN' && data.name && data.name !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot rename SUPER_ADMIN role.');
    }
    if (data.name && data.name !== role.name) {
      const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
      if (existing) {
        throw new BadRequestException('Role name must be unique.');
      }
    }
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });
    await this.auditLogService.createLog({
      action: 'ROLE_UPDATE',
      performedById: updaterId,
      details: {
        roleId: id,
        oldName: role.name,
        newName: updatedRole.name,
        oldDescription: role.description,
        newDescription: updatedRole.description,
      },
    });
    return updatedRole;
  }

  async deleteRole(deleterId: string, id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          take: 1,
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles.');
    }
    if (role.users.length > 0) {
      throw new BadRequestException('Cannot delete roles assigned to users.');
    }
    
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });

    await this.auditLogService.createLog({
      action: 'ROLE_DELETE',
      performedById: deleterId,
      details: { roleId: id, name: role.name },
    });
    return { success: true, message: 'Role deleted successfully.' };
  }

  async getPermissions() {
    const permissions = await this.prisma.permission.findMany();
    const groupedMap = new Map<string, any[]>();
    for (const p of permissions) {
      if (!groupedMap.has(p.module)) {
        groupedMap.set(p.module, []);
      }
      groupedMap.get(p.module)!.push(p);
    }
    const result = [];
    for (const [module, perms] of groupedMap.entries()) {
      result.push({
        module,
        permissions: perms,
      });
    }
    return result;
  }

  async assignPermissions(updaterId: string, id: string, data: AssignPermissionsDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    
    // Validate that all permissionIds exist in the db
    const validPermissions = await this.prisma.permission.findMany({
      where: {
        id: { in: data.permissionIds }
      }
    });
    if (validPermissions.length !== data.permissionIds.length) {
      throw new BadRequestException('Some permission IDs are invalid.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });
      if (data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((pId) => ({
            roleId: id,
            permissionId: pId,
          })),
        });
      }
    });

    const permissionKeys = validPermissions.map(p => p.key);
    await this.auditLogService.createLog({
      action: 'PERMISSION_ASSIGN',
      performedById: updaterId,
      details: { roleId: id, roleName: role.name, permissions: permissionKeys },
    });

    return { success: true, message: 'Permissions assigned successfully.' };
  }
}
