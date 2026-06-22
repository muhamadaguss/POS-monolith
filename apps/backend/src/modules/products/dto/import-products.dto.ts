import { IsFile, IsNotEmpty } from 'class-validator';

/**
 * DTO untuk import produk CSV
 */
export class ImportProductsDto {
  @IsFile()
  @IsNotEmpty()
  file: Express.Multer.File;
}
