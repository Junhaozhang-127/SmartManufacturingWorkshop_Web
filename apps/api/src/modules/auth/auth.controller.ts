import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { type CurrentUserProfile, PermissionCodes } from '@smw/shared';
import type { Response } from 'express';

import { setAuthTokenCookie } from './auth.cookie';
import { CurrentUser, RequirePermissions } from './auth.decorators';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { PermissionGuard } from './permission.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() payload: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(payload);
    setAuthTokenCookie(response, result.token);
    return result;
  }

  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.accessToken) {
      setAuthTokenCookie(response, request.accessToken);
    }
    return currentUser;
  }

  @Post('switch-role')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions(PermissionCodes.authSwitchRole)
  async switchRole(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: SwitchRoleDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.switchRole(currentUser.id, payload.roleCode);
    setAuthTokenCookie(response, result.token);
    return result;
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  changePassword(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: ChangePasswordDto) {
    return this.authService.changePassword(currentUser.id, payload);
  }
}
