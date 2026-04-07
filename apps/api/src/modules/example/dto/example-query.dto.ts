import { IsOptional, IsString, Max, Min } from 'class-validator';

export class ExampleQueryDto {
  @Min(1)
  page = 1;

  @Min(1)
  @Max(100)
  pageSize = 10;

  @IsOptional()
  @IsString()
  keyword?: string;
}
