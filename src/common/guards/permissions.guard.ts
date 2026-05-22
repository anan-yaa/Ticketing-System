import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Ensure user status is active
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Structural exception rule: if the user's role is exactly 'SUPER_ADMIN', bypass validation
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
