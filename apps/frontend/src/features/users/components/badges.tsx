const ROLE_LABEL: Record<string, string> = {
  TENANT_OWNER: "Owner",
  STORE_MANAGER: "Manajer",
  CASHIER: "Kasir",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  TENANT_OWNER: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400",
  STORE_MANAGER: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400",
  CASHIER: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${ROLE_BADGE_CLASS[role] ?? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Aktif
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      Nonaktif
    </span>
  );
}
