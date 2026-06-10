import type { ProductStatus } from '../types';
import { STATUS_LABEL } from './helpers';

export function StatusBadge({ status }: { status: ProductStatus }) {
  const dot =
    status === 'ACTIVE'
      ? 'bg-emerald-500'
      : status === 'INACTIVE'
        ? 'bg-gray-400'
        : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-700">
      <span className={`size-2 rounded-full ${dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
