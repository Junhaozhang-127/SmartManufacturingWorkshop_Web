import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkFundPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentRemark?: string;
}
