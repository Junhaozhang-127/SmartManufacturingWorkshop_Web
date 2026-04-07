import { RoleCode } from '@smw/shared';
import { IsEnum } from 'class-validator';

export class SwitchRoleDto {
  @IsEnum(RoleCode)
  roleCode!: RoleCode;
}
