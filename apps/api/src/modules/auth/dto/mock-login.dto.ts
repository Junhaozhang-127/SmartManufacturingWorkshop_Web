import { IsString, MinLength } from 'class-validator';

export class MockLoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
