import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'adminRoles';

/** Erforderliche Admin-Rollen für eine Route (superadmin darf immer). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
