import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AdminPrincipal } from './admin-principal';
import { ROLES_KEY } from './roles.decorator';

/** Prüft das Admin-JWT und danach die geforderten Rollen (superadmin darf immer). */
@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const admin = context.switchToHttp().getRequest().user as AdminPrincipal;
    const roles = admin?.roles ?? [];
    if (roles.includes('superadmin')) return true;
    if (required.some((r) => roles.includes(r))) return true;

    throw new ForbiddenException('Fehlende Admin-Berechtigung.');
  }
}
