import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { ProductStatus } from '@prisma/client';

const PRODUCT_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  sku: true,
  barcode: true,
  description: true,
  imageUrl: true,
  unit: true,
  status: true,
  hasVariants: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, color: true } },
  variants: {
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      status: true,
    },
    where: { status: ProductStatus.ACTIVE },
  },
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(currentUser: AuthenticatedUser, query: ProductQueryDto) {
    const { search, categoryId, status, outletId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      // SUPER_ADMIN tidak terikat tenant (tenantId null). Field `tenantId` di
      // schema NON-NULL, sehingga `where: { tenantId: null }` ditolak Prisma →
      // 500. Hanya filter tenantId bila ada (Owner/Manager/Cashier). Tanpa
      // tenantId, SUPER_ADMIN melihat lintas tenant.
      ...(currentUser.tenantId && { tenantId: currentUser.tenantId }),
      ...(categoryId && { categoryId }),
      ...(status && { status: status as ProductStatus }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          ...PRODUCT_SELECT,
          ...(outletId && {
            outletPrices: {
              where: { outletId },
              select: { costPrice: true, sellPrice: true, variantId: true },
            },
          }),
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPosCatalog(
    currentUser: AuthenticatedUser,
    outletId: string,
    search?: string,
    categoryId?: string,
  ) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: currentUser.tenantId!,
        status: ProductStatus.ACTIVE,
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        hasVariants: true,
        categoryId: true,
        category: { select: { id: true, name: true, color: true } },
        variants: {
          where: { status: ProductStatus.ACTIVE },
          select: {
            id: true,
            name: true,
            outletPrices: { where: { outletId }, select: { sellPrice: true } },
            inventories: { where: { outletId }, select: { quantity: true } },
          },
        },
        outletPrices: { where: { outletId, variantId: null }, select: { sellPrice: true } },
        inventories: { where: { outletId, variantId: null }, select: { quantity: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      categoryId: p.categoryId,
      hasVariants: p.hasVariants,
      price: Number(p.outletPrices[0]?.sellPrice ?? 0),
      stock: Number(p.inventories[0]?.quantity ?? 0),
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.outletPrices[0]?.sellPrice ?? 0),
        stock: Number(v.inventories[0]?.quantity ?? 0),
      })),
    }));
  }

  async findOne(id: string, currentUser: AuthenticatedUser, outletId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: currentUser.tenantId! },
      select: {
        ...PRODUCT_SELECT,
        variants: {
          select: { id: true, name: true, sku: true, barcode: true, status: true },
        },
        outletPrices: outletId
          ? { where: { outletId }, select: { outletId: true, variantId: true, costPrice: true, sellPrice: true } }
          : { select: { outletId: true, variantId: true, costPrice: true, sellPrice: true } },
      },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    return product;
  }

  async create(dto: CreateProductDto, currentUser: AuthenticatedUser) {
    const skuConflict = await this.prisma.product.findUnique({
      where: { tenantId_sku: { tenantId: currentUser.tenantId!, sku: dto.sku } },
    });
    if (skuConflict) throw new ConflictException(`SKU '${dto.sku}' sudah digunakan`);

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId: currentUser.tenantId! },
      });
      if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    }

    if (dto.hasVariants && (!dto.variants || dto.variants.length === 0)) {
      throw new BadRequestException('Produk dengan varian harus memiliki minimal 1 varian');
    }

    if (dto.variants && dto.variants.length > 0) {
      const skus = dto.variants.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      if (skus.length !== uniqueSkus.size) {
        throw new ConflictException('SKU varian tidak boleh duplikat');
      }

      const existingVariantSkus = await this.prisma.productVariant.findMany({
        where: { tenantId: currentUser.tenantId!, sku: { in: skus } },
        select: { sku: true },
      });
      if (existingVariantSkus.length > 0) {
        throw new ConflictException(
          `SKU varian sudah digunakan: ${existingVariantSkus.map((v) => v.sku).join(', ')}`,
        );
      }
    }

    return this.prisma.product.create({
      data: {
        tenantId: currentUser.tenantId!,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        description: dto.description,
        imageUrl: dto.imageUrl,
        unit: dto.unit ?? 'pcs',
        categoryId: dto.categoryId,
        hasVariants: dto.hasVariants ?? false,
        ...(dto.variants && dto.variants.length > 0 && {
          variants: {
            create: dto.variants.map((v) => ({
              tenantId: currentUser.tenantId!,
              name: v.name,
              sku: v.sku,
              barcode: v.barcode,
            })),
          },
        }),
      },
      select: PRODUCT_SELECT,
    });
  }

  async update(id: string, dto: UpdateProductDto, currentUser: AuthenticatedUser) {
    const product = await this.findOne(id, currentUser);
    const { status, hasVariants, variants, ...rest } = dto;

    const data: any = { ...rest };
    if (status) data.status = status as ProductStatus;

    // Proses varian jika dikirim
    if (variants && variants.length > 0) {
      // Validasi SKU varian tidak duplikat dalam payload baru
      const skus = variants.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      if (skus.length !== uniqueSkus.size) {
        throw new ConflictException('SKU varian tidak boleh duplikat');
      }

      // Cek SKU varian yang sudah ada di tenant lain
      const existingVariantSkus = await this.prisma.productVariant.findMany({
        where: {
          tenantId: currentUser.tenantId!,
          sku: { in: skus },
          productId: { not: id }, // exclude produk ini
        },
        select: { sku: true },
      });
      if (existingVariantSkus.length > 0) {
        throw new ConflictException(
          `SKU varian sudah digunakan: ${existingVariantSkus.map((v) => v.sku).join(', ')}`,
        );
      }

      // Ambil varian existing produk ini
      const existingVariants = await this.prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true, sku: true },
      });
      const existingSkuMap = new Map(existingVariants.map((v) => [v.sku, v.id]));
      const newSkuSet = new Set(skus);

      // Build operations untuk varian
      const variantOperations: any[] = [];

      // 1. Update varian yang sudah ada (by SKU)
      for (const v of variants) {
        if (existingSkuMap.has(v.sku)) {
          // Update existing
          variantOperations.push({
            where: { sku: v.sku, productId: id },
            data: { name: v.name, barcode: v.barcode },
          });
        } else {
          // Create new
          variantOperations.push({
            create: {
              tenantId: currentUser.tenantId!,
              productId: id,
              name: v.name,
              sku: v.sku,
              barcode: v.barcode,
            },
          });
        }
      }

      // 2. Hapus varian yang tidak ada di payload baru
      for (const existing of existingVariants) {
        if (!newSkuSet.has(existing.sku)) {
          variantOperations.push({
            where: { id: existing.id },
            delete: true,
          });
        }
      }

      // Eksekusi semua operasi varian
      for (const op of variantOperations) {
        if (op.delete) {
          await this.prisma.productVariant.delete({ where: op.where });
        } else if (op.create) {
          await this.prisma.productVariant.create({ data: op.create });
        } else if (op.where && op.data) {
          await this.prisma.productVariant.update({ where: op.where, data: op.data });
        }
      }

      data.hasVariants = true;
    } else if (hasVariants !== undefined) {
      // Jika hasVariants di-false-kan, hapus semua varian
      if (!hasVariants) {
        await this.prisma.productVariant.deleteMany({ where: { productId: id } });
      }
      data.hasVariants = hasVariants;
    }

    return this.prisma.product.update({
      where: { id },
      data,
      select: PRODUCT_SELECT,
    });
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: currentUser.tenantId! },
      include: { _count: { select: { transactionItems: true } } },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    if (product._count.transactionItems > 0) {
      // Jika sudah ada transaksi, soft-delete — jangan hapus untuk menjaga integritas data
      return this.prisma.product.update({
        where: { id },
        data: { status: ProductStatus.DELETED },
        select: { id: true, name: true, status: true },
      });
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Produk berhasil dihapus' };
  }

  // ---- Outlet Price ----

  async setPrice(productId: string, dto: SetPriceDto, currentUser: AuthenticatedUser) {
    await this.findOne(productId, currentUser);

    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, tenantId: currentUser.tenantId! },
    });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan');

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId },
      });
      if (!variant) throw new NotFoundException('Varian tidak ditemukan');
    }

    // CATATAN: tidak memakai `upsert` pada compound unique
    // [outletId, productId, variantId] karena `variantId` nullable. Di Postgres,
    // NULL tidak pernah sama dengan NULL pada unique index, sehingga
    // `where: { ...variantId: null }` melempar di runtime (sebelumnya → 500 saat
    // set harga produk tanpa varian). Cari manual lalu create/update.
    const variantId = dto.variantId ?? null;
    const existing = await this.prisma.outletPrice.findFirst({
      where: { outletId: dto.outletId, productId, variantId },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.outletPrice.update({
        where: { id: existing.id },
        data: { costPrice: dto.costPrice, sellPrice: dto.sellPrice },
      });
    }

    return this.prisma.outletPrice.create({
      data: {
        tenantId: currentUser.tenantId!,
        outletId: dto.outletId,
        productId,
        variantId,
        costPrice: dto.costPrice,
        sellPrice: dto.sellPrice,
      },
    });
  }

  async getPrices(productId: string, currentUser: AuthenticatedUser) {
    await this.findOne(productId, currentUser);

    return this.prisma.outletPrice.findMany({
      where: { productId, tenantId: currentUser.tenantId! },
      include: {
        outlet: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, sku: true } },
      },
    });
  }

  async importProducts(file: Express.Multer.File, currentUser: AuthenticatedUser) {
    const csvParser = require('csv-parser');
    const fs = require('fs');

    const results: any[] = [];
    const stream = fs.createReadStream(file.path);

    return new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row: any) => results.push(row))
        .on('end', async () => {
          try {
            const tenantId = currentUser.tenantId!;

            // Get all outlets — produk masuk ke semua outlet
            const outlets = await this.prisma.outlet.findMany({
              where: { tenantId },
            });

            const errors: any[] = [];
            const products: any[] = [];
            let successCount = 0;

            for (let i = 0; i < results.length; i++) {
              const row = results[i];
              const rowNum = i + 1;

              try {
                // Validate required fields
                if (!row.name || !row.sku || !row.price) {
                  errors.push({ row: rowNum, message: 'Nama, SKU, dan harga wajib diisi', data: row });
                  continue;
                }

                // Validate SKU format
                if (!/^[a-z0-9-]+$/.test(row.sku)) {
                  errors.push({ row: rowNum, message: 'SKU hanya boleh huruf kecil, angka, dan tanda hubung', data: row });
                  continue;
                }

                // Validate price
                const price = parseFloat(row.price);
                if (isNaN(price) || price < 0) {
                  errors.push({ row: rowNum, message: 'Harga harus angka valid >= 0', data: row });
                  continue;
                }

                // Parse variants
                let variants: any[] = [];
                if (row.variants) {
                  const parts = row.variants.split(',').map((v: string) => v.trim());
                  for (const part of parts) {
                    const [name, ...opts] = part.split('|');
                    if (name && opts.length > 0) {
                      variants.push({ name, options: opts });
                    }
                  }
                }

                // Check duplicate SKU
                const existing = await this.prisma.product.findUnique({
                  where: { tenantId_sku: { tenantId, sku: row.sku } },
                });
                if (existing) {
                  errors.push({ row: rowNum, message: `SKU ${row.sku} sudah ada`, data: row });
                  continue;
                }

                // Find or create category
                let categoryId: string | null = null;
                if (row.category) {
                  let cat = await this.prisma.category.findFirst({ where: { tenantId, name: row.category.trim() } });
                  if (!cat) {
                    cat = await this.prisma.category.create({ data: { tenantId, name: row.category.trim(), color: '#006C49' } });
                  }
                  categoryId = cat.id;
                }

                // Create product + variants + inventory
                await this.prisma.$transaction(async (tx) => {
                  const product = await tx.product.create({
                    data: {
                      tenantId,
                      categoryId,
                      name: row.name.trim(),
                      sku: row.sku.trim(),
                      barcode: row.barcode || null,
                      description: row.description || null,
                      unit: row.unit || 'pcs',
                      status: row.is_active === 'false' || row.is_active === false ? ProductStatus.INACTIVE : ProductStatus.ACTIVE,
                      hasVariants: variants.length > 0,
                    },
                  });

                  // Create variant options
                  for (const v of variants) {
                    for (const opt of v.options) {
                      await tx.productVariant.create({
                        data: {
                          productId: product.id,
                          tenantId,
                          name: opt.trim(),
                          sku: `${product.sku}-${opt.trim()}`,
                          status: ProductStatus.ACTIVE,
                        },
                      });
                    }
                  }

                  // Insert stock & price ke semua outlet
                  if (outlets.length > 0) {
                    const stockQty = row.stock && !isNaN(parseFloat(row.stock)) && parseFloat(row.stock) > 0
                      ? parseFloat(row.stock) : 0;

                    for (const outlet of outlets) {
                      await tx.inventory.create({
                        data: {
                          tenantId,
                          outletId: outlet.id,
                          productId: product.id,
                          quantity: stockQty,
                          minStock: row.min_stock ? parseFloat(row.min_stock) : 0,
                        },
                      });

                      await tx.outletPrice.create({
                        data: {
                          tenantId,
                          outletId: outlet.id,
                          productId: product.id,
                          sellPrice: price,
                          costPrice: row.cost ? parseFloat(row.cost) : 0,
                        },
                      });
                    }
                  }
                });

                products.push({ id: `row_${rowNum}`, name: row.name, sku: row.sku, status: 'CREATED' });
                successCount++;
              } catch (err: any) {
                errors.push({ row: rowNum, message: err.message, data: row });
              }
            }

            resolve({ totalRows: results.length, successCount, errorCount: errors.length, errors, products });
          } catch (err: any) {
            reject(err);
          }
        })
        .on('error', (err: any) => reject(err));
    });
  }
}
