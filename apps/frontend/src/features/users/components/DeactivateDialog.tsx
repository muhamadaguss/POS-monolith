'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deactivateStaff } from "@/features/users/api";
import { toastSuccess, errorAlert } from "@/lib/swal";
import type { StaffMember } from "@/features/users/api";

interface DeactivateDialogProps {
  staff: StaffMember | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export function DeactivateDialog({
  staff,
  onClose,
  onConfirmed,
}: DeactivateDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isActive = staff?.status === "ACTIVE";

  async function handleConfirm() {
    if (!staff) return;
    setError("");
    setPending(true);
    try {
      await deactivateStaff(staff.id);
      toastSuccess(isActive ? "Karyawan dinonaktifkan" : "Status diperbarui");
      onConfirmed();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      errorAlert(msg ?? "Operasi gagal");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!staff} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {isActive ? "Nonaktifkan Karyawan?" : "Detail Status"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {isActive ? (
            <p className="text-sm text-gray-600">
              Akun <span className="font-semibold">{staff?.name}</span> akan
              dinonaktifkan dan tidak bisa login lagi. Tindakan ini bisa
              dipulihkan melalui Edit.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Akun <span className="font-semibold">{staff?.name}</span> sudah
              nonaktif. Aktifkan kembali melalui Edit Karyawan.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Batal
            </Button>
            {isActive && (
              <Button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  "Nonaktifkan"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
