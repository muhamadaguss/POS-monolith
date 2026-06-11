import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateOutletDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) taxRate?: number;
  @IsOptional() @IsString() receiptNote?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
