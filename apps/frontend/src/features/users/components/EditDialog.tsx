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
import { updateStaff } from "@/features/users/api";
import { toastSuccess, errorAlert } from "@/lib/swal";
import type { StaffMember, UpdateStaffPayload } from "@/features/users/api";

interface EditDialogProps {
  staff: StaffMember | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditDialog({ staff, onClose, onSaved }: EditDialogProps) {
  const [form, setForm] = useState<UpdateStaffPayload>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name,
        phone: staff.phone ?? "",
        status: staff.status,
      });
      setError("");
    }
  }, [staff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff) return;
    setError("");
    setPending(true);
    try {
      const payload: UpdateStaffPayload = {};
      if (form.name && form.name !== staff.name) payload.name = form.name;
      if (form.phone !== undefined && form.phone !== (staff.phone ?? ""))
        payload.phone = form.phone;
      if (form.status && form.status !== staff.status)
        payload.status = form.status;
      if (form.password) payload.password = form.password;
      if (form.pin && form.pin.length === 6) payload.pin = form.pin;
      await updateStaff(staff.id, payload);
      toastSuccess("Data karyawan berhasil diperbarui");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      errorAlert(msg ?? "Gagal memperbarui data");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!staff} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Karyawan</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">{staff?.email}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nama Lengkap</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>No. HP</Label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="081234567890"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Password Baru{" "}
              <span className="text-gray-400">
                (kosongkan jika tidak diubah)
              </span>
            </Label>
            <Input
              type="password"
              value={form.password ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="Min. 8 karakter"
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              PIN Baru{" "}
              <span className="text-gray-400">
                (kosongkan jika tidak diubah)
              </span>
            </Label>
            <Input
              value={form.pin ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
              placeholder="6 digit angka"
              inputMode="numeric"
              maxLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={form.status ?? "ACTIVE"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as "ACTIVE" | "INACTIVE",
                }))
              }
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
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
