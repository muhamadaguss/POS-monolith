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
    await this.findOne(id, currentUser);
    const { status, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(status && { status: status as ProductStatus }),
      },
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
}
