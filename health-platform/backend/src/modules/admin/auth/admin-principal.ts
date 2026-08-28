import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AdminPrincipal {
  adminId: string;
  email: string;
  roles: string[];
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminPrincipal => {
    return ctx.switchToHttp().getRequest().user as AdminPrincipal;
  },
);
