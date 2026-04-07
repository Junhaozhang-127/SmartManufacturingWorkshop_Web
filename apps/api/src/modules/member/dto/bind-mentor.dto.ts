import { IsString } from 'class-validator';

export class BindMentorDto {
  @IsString()
  mentorUserId!: string;
}
