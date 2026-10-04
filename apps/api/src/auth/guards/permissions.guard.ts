import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permissions || !Array.isArray(user.permissions)) {
      throw new ForbiddenException('User lacks required permissions');
    }

    const hasAllRequired = requiredPermissions.every((perm) =>
      user.permissions.includes(perm),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException('Forbidden: Insufficient permissions');
    }

    return true;
  }
}
