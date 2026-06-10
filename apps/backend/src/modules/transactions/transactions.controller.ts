import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { PERMISSIONS } from '../../common/rbac/permissions';

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.POS_TRANSACTION)
  @ApiOperation({ summary: 'Checkout — buat transaksi baru, potong stok, buat struk' })
  createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transactionsService.createTransaction(dto, user);
  }

  @Post(':id/void')
  @RequirePermissions(PERMISSIONS.POS_TRANSACTION)
  @ApiOperation({ summary: 'Void transaksi — butuh PIN Manager, restore stok' })
  voidTransaction(
    @Param('id') id: string,
    @Body() dto: VoidTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transactionsService.voidTransaction(id, dto, user);
  }

  @Post(':id/refund')
  @RequirePermissions(PERMISSIONS.POS_TRANSACTION)
  @ApiOperation({ summary: 'Refund transaksi — butuh PIN Manager, restore stok, status REFUNDED' })
  refundTransaction(
    @Param('id') id: string,
    @Body() dto: RefundTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transactionsService.refundTransaction(id, dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.POS_TRANSACTION)
  @ApiOperation({ summary: 'Daftar transaksi — filter outlet/shift/status/tanggal' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.POS_TRANSACTION)
  @ApiOperation({ summary: 'Detail transaksi beserta semua item' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.findOne(id, user);
  }
}
