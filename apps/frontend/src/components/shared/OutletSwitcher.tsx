'use client';

import { useState } from 'react';
import { Building2, ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/features/auth/store';
import { useSelectOutlet } from '@/features/auth/hooks';

const ROLE_LABEL: Record<string, string> = {
  TENANT_OWNER: 'Pemilik',
  STORE_MANAGER: 'Manajer',
  CASHIER: 'Kasir',
};

function roleColors(role: string): { icon: string; badge: string; check: string } {
  if (role === 'STORE_MANAGER') {
    return { icon: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700', check: 'text-blue-600' };
  }
  return { icon: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700', check: 'text-emerald-600' };
}

export function OutletSwitcher() {
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const { selectOutlet, isPending } = useSelectOutlet();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const current = outlets.find((o) => o.id === user?.currentOutletId);
  const canSwitch = outlets.length > 1;
  const userColors = roleColors(user?.role ?? '');

  async function handleSwitch(outletId: string) {
    if (outletId === user?.currentOutletId || !canSwitch) return;
    setSwitchingId(outletId);
    await selectOutlet(outletId);
    setSwitchingId(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!canSwitch || isPending}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        {/* Icon outlet — warna sesuai role */}
        <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${userColors.icon}`}>
          {isPending ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Building2 className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Nama outlet + label role */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {current?.name ?? 'Pilih Outlet'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
          </p>
        </div>

        {/* Badge jumlah outlet + chevron */}
        {canSwitch && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${userColors.badge}`}>
              {outlets.length}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </DropdownMenuTrigger>

      {canSwitch && (
        <DropdownMenuContent className="w-64" align="start" sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-gray-400 font-normal">
              Pilih cabang aktif
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {outlets.map((outlet) => {
              const isActive = outlet.id === user?.currentOutletId;
              const isLoading = switchingId === outlet.id;
              const outletColors = roleColors(outlet.role);
              const outletRoleLabel = ROLE_LABEL[outlet.role] ?? outlet.role;

              return (
                <DropdownMenuItem
                  key={outlet.id}
                  onClick={() => handleSwitch(outlet.id)}
                  disabled={isActive || isPending}
                  className="flex items-center gap-3 cursor-pointer py-2.5"
                >
                  {/* Icon outlet per baris */}
                  <div className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
                    isActive ? outletColors.icon : 'bg-gray-100'
                  }`}>
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    )}
                  </div>

                  {/* Nama + badge role per outlet */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{outlet.name}</p>
                    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${outletColors.badge}`}>
                      {outletRoleLabel}
                    </span>
                  </div>

                  {isActive && <Check className={`w-4 h-4 shrink-0 ${outletColors.check}`} />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
