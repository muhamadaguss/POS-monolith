'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ShieldCheck,
  UserCog,
  KeyRound,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toastSuccess, errorAlert } from '@/lib/swal';
import { formatDate } from '@/lib/format';
import {
  setUserStatusAction,
  setUserRoleAction,
  resetUserPasswordAction,
} from '@/features/admin/actions';
import type {
  AdminUser,
  AdminUserListResponse,
  AssignableRole,
} from '@/features/admin/types';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_OWNER: 'Owner',
  STORE_MANAGER: 'Manajer',
  CASHIER: 'Kasir',
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  TENANT_OWNER: 'bg-purple-100 text-purple-700',
  STORE_MANAGER: 'bg-emerald-100 text-emerald-700',
  CASHIER: 'bg-blue-100 text-blue-700',
};

const ASSIGNABLE: AssignableRole[] = ['TENANT_OWNER', 'STORE_MANAGER', 'CASHIER'];

export function AdminUsersView({
  data,
  selfId,
  search,
  role,
  status,
  page,
}: {
  data: AdminUserListResponse;
  selfId: string;
  search: string;
  role: string;
  status: string;
  page: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);

  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);

  function pushParams(patch: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (resetPage) params.delete('page');
    startTransition(() => router.push(`/admin/users?${params.toString()}`));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ search: searchInput.trim() });
  }

  const refresh = () => startTransition(() => router.refresh());

  async function toggleStatus(u: AdminUser) {
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await setUserStatusAction(u.id, next);
      toastSuccess(next === 'ACTIVE' ? 'User diaktifkan' : 'User dinonaktifkan');
      refresh();
    } catch (err) {
      errorAlert(err instanceof Error ? err.message : 'Gagal mengubah status');
    }
  }

  const meta = data.meta;
  const totalPages = meta.totalPages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola semua user lintas-tenant: role, status, dan reset password.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            aria-label="Cari user"
            placeholder="Cari nama / email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </form>
        <select
          aria-label="Filter role"
          value={role}
          onChange={(e) => pushParams({ role: e.target.value })}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Semua Role</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="TENANT_OWNER">Owner</option>
          <option value="STORE_MANAGER">Manajer</option>
          <option value="CASHIER">Kasir</option>
        </select>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => pushParams({ status: e.target.value })}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="LOCKED">Terkunci</option>
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Tenant</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Login Terakhir</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    Tidak ada user.
                  </td>
                </tr>
              ) : (
                data.items.map((u) => {
                  const isSuper = u.role === 'SUPER_ADMIN';
                  const isSelf = u.id === selfId;
                  const locked = isSuper || isSelf; // tak bisa diubah dari UI
                  return (
                    <tr key={u.id} className="border-b border-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {u.tenant?.name ?? <span className="text-gray-400">Platform</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role]}`}
                        >
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={u.status} />
                        {u.mustChangePassword && (
                          <span className="ml-1 text-[10px] text-amber-600">• wajib ganti pw</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn
                            title="Ubah role"
                            disabled={locked}
                            onClick={() => setRoleTarget(u)}
                          >
                            <UserCog className="w-4 h-4" />
                          </IconBtn>
                          <IconBtn
                            title="Reset password"
                            disabled={locked}
                            onClick={() => setResetTarget(u)}
                          >
                            <KeyRound className="w-4 h-4" />
                          </IconBtn>
                          <IconBtn
                            title={u.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                            disabled={locked}
                            onClick={() => toggleStatus(u)}
                            danger={u.status === 'ACTIVE'}
                          >
                            {u.status === 'ACTIVE' ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta.total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} dari{' '}
              {meta.total} user
            </span>
            <div className="flex items-center gap-2" aria-busy={isPending}>
              <IconBtn
                title="Sebelumnya"
                disabled={page <= 1}
                onClick={() => pushParams({ page: String(page - 1) }, false)}
              >
                <ChevronLeft className="w-4 h-4" />
              </IconBtn>
              <span className="tabular-nums">
                {meta.page} / {totalPages}
              </span>
              <IconBtn
                title="Selanjutnya"
                disabled={page >= totalPages}
                onClick={() => pushParams({ page: String(page + 1) }, false)}
              >
                <ChevronRight className="w-4 h-4" />
              </IconBtn>
            </div>
          </div>
        )}
      </div>

      {roleTarget && (
        <RoleDialog
          user={roleTarget}
          onClose={() => setRoleTarget(null)}
          onDone={() => {
            setRoleTarget(null);
            refresh();
          }}
        />
      )}
      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
      </span>
    );
  }
  const label = status === 'LOCKED' ? 'Terkunci' : 'Nonaktif';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> {label}
    </span>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg border border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function RoleDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [role, setRole] = useState<AssignableRole>(
    ASSIGNABLE.includes(user.role as AssignableRole) ? (user.role as AssignableRole) : 'CASHIER',
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await setUserRoleAction(user.id, role);
      toastSuccess('Role diperbarui');
      onDone();
    } catch (err) {
      errorAlert(err instanceof Error ? err.message : 'Gagal mengubah role');
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Role — {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label className="text-xs text-gray-500">Role baru</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AssignableRole)}
            className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          >
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            Mengubah role global user. Super Admin tidak dapat ditetapkan dari sini.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function doReset() {
    setLoading(true);
    try {
      const res = await resetUserPasswordAction(user.id);
      setPassword(res.password);
    } catch (err) {
      errorAlert(err instanceof Error ? err.message : 'Gagal mereset password');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan */
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password — {user.name}</DialogTitle>
        </DialogHeader>

        {!password ? (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Password baru akan dibuat otomatis & ditampilkan <b>sekali</b>. User wajib
                menggantinya saat login berikutnya. Sesi aktif user akan diputus.
              </span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Batal
              </Button>
              <Button onClick={doReset} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Reset Password
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Salin & sampaikan password ini ke user. Tidak akan ditampilkan lagi.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono break-all">
                {password}
              </code>
              <button
                type="button"
                onClick={copy}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                title="Salin"
                aria-label="Salin password"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Selesai</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
