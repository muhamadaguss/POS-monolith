import { formatIDR, toNum, formatDateTimeLong } from '@/lib/format';
import type { ReceiptData, PaymentMethod } from '../types';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  DEBIT_CARD: 'Kartu Debit',
  CREDIT_CARD: 'Kartu Kredit',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer',
  OTHER: 'Lainnya',
};

/**
 * Struk transaksi — presentasional murni. Lebar ala kertas thermal (~58mm),
 * font monospace. Diberi id `receipt-print-area` sebagai target CSS @media print
 * (lihat globals.css) agar hanya area ini yang tercetak via window.print().
 */
export function Receipt({ data }: { data: ReceiptData }) {
  const discount = toNum(data.discountAmount);
  const tax = toNum(data.taxAmount);

  return (
    <div
      id="receipt-print-area"
      className="mx-auto w-[280px] bg-white px-4 py-3 font-mono text-[11px] leading-snug text-black"
    >
      {/* Header outlet */}
      <div className="text-center">
        <p className="text-sm font-bold">{data.outlet.name}</p>
        {data.outlet.address && <p>{data.outlet.address}</p>}
        {data.outlet.city && <p>{data.outlet.city}</p>}
        {data.outlet.phone && <p>Telp: {data.outlet.phone}</p>}
      </div>

      <Divider />

      {/* Info transaksi */}
      <div className="space-y-0.5">
        <Row label="No" value={data.receiptNumber} />
        <Row label="Waktu" value={formatDateTimeLong(data.createdAt)} />
        {data.cashier?.name && <Row label="Kasir" value={data.cashier.name} />}
        <Row label="Bayar" value={PAYMENT_LABEL[data.paymentMethod]} />
      </div>

      <Divider />

      {/* Item */}
      <div className="space-y-1">
        {data.items.map((item, i) => {
          const name = item.variantName
            ? `${item.productName} (${item.variantName})`
            : item.productName;
          return (
            <div key={i}>
              <p className="truncate">{name}</p>
              <div className="flex justify-between">
                <span>
                  {toNum(item.quantity)} x {formatIDR(item.unitPrice)}
                </span>
                <span>{formatIDR(item.subtotal)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Divider />

      {/* Total */}
      <div className="space-y-0.5">
        <Row label="Subtotal" value={formatIDR(data.subtotal)} />
        {discount > 0 && <Row label="Diskon" value={`-${formatIDR(discount)}`} />}
        {tax > 0 && <Row label="Pajak" value={formatIDR(tax)} />}
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>{formatIDR(data.totalAmount)}</span>
        </div>
        <Row label="Dibayar" value={formatIDR(data.amountPaid)} />
        <Row label="Kembali" value={formatIDR(data.changeAmount)} />
      </div>

      {/* Footer */}
      {data.outlet.receiptNote && (
        <>
          <Divider />
          <p className="text-center">{data.outlet.receiptNote}</p>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-gray-400" />;
}
