import { IsString, MaxLength } from 'class-validator';

export class CreateDemoApprovalDto {
  @IsString()
  @MaxLength(128)
  title!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}
