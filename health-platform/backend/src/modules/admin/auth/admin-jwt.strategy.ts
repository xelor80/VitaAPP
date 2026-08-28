import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminPrincipal } from './admin-principal';

interface AdminJwtPayload {
  sub: string;
  email: string;
  roles: string[];
  admin: true;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.adminSecret') ?? 'dev-admin-secret',
    });
  }

  validate(payload: AdminJwtPayload): AdminPrincipal {
    return {
      adminId: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
    };
  }
}
