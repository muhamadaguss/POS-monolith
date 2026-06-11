export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  /** Path relatif (/uploads/...) atau URL penuh; null bila tanpa gambar. */
  imageUrl: string | null;
  categoryId: string;
  hasVariants: boolean;
  /** Harga dari OutletPrice — berlaku jika tidak ada varian */
  price: number;
  /** Stok aktual outlet aktif */
  stock: number;
  variants: ProductVariant[];
}

export interface Discount {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  minPurchase: number;
  maxDiscount: number | null;
}

export interface CheckoutPayload {
  outletId: string;
  items: { productId: string; variantId?: string | null; quantity: number }[];
  discountId?: string | null;
  paymentMethod: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QRIS' | 'TRANSFER' | 'OTHER';
  amountPaid: number;
  notes?: string;
}

export interface ActiveShift {
  id: string;
  outletId: string;
  openedAt: string;
}

/** Metode pembayaran — dipakai POS, struk, dan riwayat transaksi. */
export type PaymentMethod =
  | 'CASH'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'QRIS'
  | 'TRANSFER'
  | 'OTHER';

/** Status siklus hidup transaksi. */
export type TransactionStatus =
  | 'COMPLETED'
  | 'VOIDED'
  | 'PENDING'
  | 'REFUNDED'
  | 'PARTIAL_REFUND';

export interface TransactionItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Transaction {
  id: string;
  receiptNumber: string;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  createdAt: string;
  voidReason?: string | null;
  refundReason?: string | null;
  items: TransactionItem[];
}

/** Metadata paginasi standar dari endpoint list backend. */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionListResult {
  items: Transaction[];
  meta: PaginationMeta;
}

export interface TransactionQuery {
  outletId: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
  status?: TransactionStatus;
}
