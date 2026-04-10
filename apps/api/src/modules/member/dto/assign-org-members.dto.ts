import { IsArray, IsString } from 'class-validator';

export class AssignOrgMembersDto {
  @IsArray()
  @IsString({ each: true })
  memberProfileIds!: string[];
}

