import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole as Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No specific roles required
    }

    const { user } = context.switchToHttp().getRequest();
    
    console.log('RolesGuard -> Authenticated user:', user);
    console.log('RolesGuard -> Required roles:', requiredRoles);

    if (!user) {
      throw new ForbiddenException('User not authenticated.');
    }

    // Explicit check for user activation status
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is deactivated.');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
