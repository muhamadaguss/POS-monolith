import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Terima URL http(s) penuh ATAU path relatif hasil upload (/uploads/...). */
export const IMAGE_URL_REGEX = /^(https?:\/\/.+|\/uploads\/.+)$/i;

class VariantInputDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(IMAGE_URL_REGEX, {
    message: 'imageUrl harus berupa URL http(s) atau path /uploads/...',
  })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'DELETED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'DELETED';

  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  variants?: VariantInputDto[];
}
