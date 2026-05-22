import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SystemRole as Role } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(data: any) {
    const { email, password, name } = data;
    
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already in use.');
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    const customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });

    // Create the new user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        systemRole: Role.CUSTOMER,
        roleId: customerRole?.id,
        status: 'INACTIVE', // Default for onboarding as per schema
      },
    });

    return {
      message: 'User registered successfully. Awaiting activation.',
      user: { id: user.id, email: user.email, name: user.name, role: user.systemRole }
    };
  }

  async login(data: any) {
    const { email, password } = data;
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Verify user exists and password is correct
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Ensure the user account is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is deactivated.');
    }

    let roleName = user.systemRole as string;
    let permissionKeys: string[] = [];

    if (user.role) {
      roleName = user.role.name;
      permissionKeys = user.role.permissions.map(rp => rp.permission.key);
    } else {
      // Fallback lookup by systemRole name
      const systemRoleRecord = await this.prisma.role.findUnique({
        where: { name: user.systemRole },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
      if (systemRoleRecord) {
        roleName = systemRoleRecord.name;
        permissionKeys = systemRoleRecord.permissions.map(rp => rp.permission.key);
      }
    }

    // Resolve roleId
    let resolvedRoleId = user.roleId;
    if (!resolvedRoleId) {
      const dbRole = await this.prisma.role.findUnique({ where: { name: user.systemRole } });
      resolvedRoleId = dbRole?.id || '';
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      userId: user.id,
      roleId: resolvedRoleId,
      email: user.email,
      role: roleName,
      permissions: permissionKeys,
      status: user.status
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: {
          name: roleName,
        },
        permissions: permissionKeys,
        status: user.status,
      },
      requiresPasswordChange: user.mustChangePassword,
    };
  }

  async changePassword(userId: string, body: any) {
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    await this.auditLogService.createLog({
      action: 'CHANGE_PASSWORD',
      performedById: userId,
      details: {
        targetUserId: userId,
        targetUserEmail: user.email,
      },
    });

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }
}
