import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AccessControlService } from './access-control.service';
import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { DataScopeGuard } from './data-scope.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessControlService,
    AccessTokenService,
    CaptchaService,
    AuthGuard,
    PermissionGuard,
    DataScopeGuard,
  ],
  exports: [AccessControlService, AccessTokenService, AuthGuard, PermissionGuard, DataScopeGuard],
})
export class AuthModule {}
