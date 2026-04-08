import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { type CurrentUserProfile, PermissionCodes } from '@smw/shared';

import { CurrentUser, RequirePermissions } from './auth.decorators';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { PermissionGuard } from './permission.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() currentUser: CurrentUserProfile) {
    return currentUser;
  }

  @Post('switch-role')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions(PermissionCodes.authSwitchRole)
  switchRole(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: SwitchRoleDto) {
    return this.authService.switchRole(currentUser.id, payload.roleCode);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  changePassword(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: ChangePasswordDto) {
    return this.authService.changePassword(currentUser.id, payload);
  }
}
