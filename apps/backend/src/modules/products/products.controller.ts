import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CurrentUser, Roles, RequirePermissions } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

/** Konfigurasi Multer untuk upload gambar produk ke disk lokal. */
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const productImageStorage = diskStorage({
  destination: './uploads/products',
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar produk — support filter nama/SKU/kategori/status' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ProductQueryDto) {
    return this.productsService.findAll(user, query);
  }

  @Get('pos-catalog')
  @RequirePermissions(PERMISSIONS.POS_TRANSACTION)
  @ApiOperation({ summary: 'Katalog POS — produk aktif dengan harga & stok outlet, tanpa pagination' })
  @ApiQuery({ name: 'outletId', required: true })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  getPosCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.getPosCatalog(user, outletId, search, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail produk termasuk varian dan harga per outlet' })
  @ApiQuery({ name: 'outletId', required: false, description: 'Sertakan harga outlet ini' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('outletId') outletId?: string,
  ) {
    return this.productsService.findOne(id, user, outletId);
  }

  @Post()
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Tambah produk baru ke katalog' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.create(dto, user);
  }

  @Post('upload-image')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Upload gambar produk — kembalikan URL publik' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: productImageStorage,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_MIME.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Format gambar harus JPG, PNG, atau WEBP.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File gambar wajib diunggah.');
    }
    // URL relatif — frontend menggabungkannya dengan origin backend.
    return { url: `/uploads/products/${file.filename}` };
  }

  @Patch(':id')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Update data produk' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.TENANT_OWNER)
  @RequirePermissions(PERMISSIONS.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Soft-delete produk (status → DELETED)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.remove(id, user);
  }

  @Get(':id/prices')
  @RequirePermissions(PERMISSIONS.PRICE_MANAGE)
  @ApiOperation({ summary: 'Lihat harga produk di semua outlet' })
  getPrices(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.getPrices(id, user);
  }

  @Post(':id/prices')
  @Roles(Role.STORE_MANAGER)
  @RequirePermissions(PERMISSIONS.PRICE_MANAGE)
  @ApiOperation({ summary: 'Set harga jual & HPP produk di outlet tertentu' })
  setPrice(
    @Param('id') id: string,
    @Body() dto: SetPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.setPrice(id, dto, user);
  }
}
