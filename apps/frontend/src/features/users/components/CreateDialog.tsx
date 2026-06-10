'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createStaff } from "@/features/users/api";
import { toastSuccess, errorAlert } from "@/lib/swal";
import type { CreateStaffPayload } from "@/features/users/api";

interface CreateDialogProps {
  open: boolean;
  outlets: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

export function CreateDialog({ open, outlets, onClose, onSaved }: CreateDialogProps) {
  const [form, setForm] = useState<CreateStaffPayload>({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "CASHIER",
    outletId: outlets[0]?.id ?? "",
    pin: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "CASHIER",
        outletId: outlets[0]?.id ?? "",
        pin: "",
      });
      setError("");
    }
  }, [open, outlets]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.outletId) {
      setError("Pilih outlet terlebih dahulu");
      return;
    }
    setPending(true);
    try {
      const payload: CreateStaffPayload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        outletId: form.outletId,
      };
      if (form.phone) payload.phone = form.phone;
      if (form.pin && form.pin.length === 6) payload.pin = form.pin;
      await createStaff(payload);
      toastSuccess("Karyawan berhasil ditambahkan");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      errorAlert(msg ?? "Gagal membuat karyawan");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Karyawan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nama Lengkap</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Budi Santoso"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
              placeholder="budi@toko.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              required
              placeholder="Min. 8 karakter"
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              No. HP <span className="text-gray-400">(opsional)</span>
            </Label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="081234567890"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as "STORE_MANAGER" | "CASHIER",
                  }))
                }
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CASHIER">Kasir</option>
                <option value="STORE_MANAGER">Manager</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <select
                value={form.outletId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, outletId: e.target.value }))
                }
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              PIN Kasir{" "}
              <span className="text-gray-400">(opsional, 6 digit)</span>
            </Label>
            <Input
              value={form.pin ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                "Simpan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
