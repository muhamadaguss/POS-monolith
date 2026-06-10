import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(currentUser: AuthenticatedUser) {
    return this.prisma.category.findMany({
      where: { tenantId: currentUser.tenantId! },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId: currentUser.tenantId! },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    return category;
  }

  async create(dto: CreateCategoryDto, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.category.findFirst({
      where: { tenantId: currentUser.tenantId!, name: dto.name },
    });
    if (existing) throw new ConflictException('Nama kategori sudah ada');

    return this.prisma.category.create({
      data: { tenantId: currentUser.tenantId!, ...dto },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, currentUser: AuthenticatedUser) {
    await this.findOne(id, currentUser);

    if (dto.name) {
      const conflict = await this.prisma.category.findFirst({
        where: { tenantId: currentUser.tenantId!, name: dto.name, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Nama kategori sudah ada');
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const category = await this.findOne(id, currentUser);

    if (category._count.products > 0) {
      throw new ConflictException(
        `Tidak bisa menghapus kategori yang masih memiliki ${category._count.products} produk`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Kategori berhasil dihapus' };
  }
}
