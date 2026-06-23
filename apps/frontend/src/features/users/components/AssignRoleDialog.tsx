'use client';

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assignOutletRole, unassignOutletRole } from "@/features/users/api";
import { toastSuccess, errorAlert } from "@/lib/swal";
import type { StaffMember } from "@/features/users/api";

interface AssignRoleDialogProps {
  staff: StaffMember | null;
  outlets: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

export function AssignRoleDialog({
  staff,
  outlets,
  onClose,
  onSaved,
}: AssignRoleDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<"STORE_MANAGER" | "CASHIER">("CASHIER");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (staff) {
      // Pre-select outlet yang sudah punya role
      const existing = staff.outletRoles.map((r) => r.outlet.id);
      setSelectedIds(existing.length > 0 ? existing : outlets[0] ? [outlets[0].id] : []);
      setRole("CASHIER");
      setError("");
    }
  }, [staff, outlets]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || selectedIds.length === 0) return;
    setError("");
    setPending(true);
    try {
      const previousIds = staff.outletRoles.map((r) => r.outlet.id);
      const toRemove = previousIds.filter((id) => !selectedIds.includes(id));
      await Promise.all([
        ...selectedIds.map((outletId) => assignOutletRole(staff.id, outletId, role)),
        ...toRemove.map((outletId) => unassignOutletRole(staff.id, outletId)),
      ]);
      toastSuccess("Penempatan outlet berhasil disimpan");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      errorAlert(msg ?? "Gagal assign role");
    } finally {
      setPending(false);
    }
  }

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOutlet(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedLabel =
    selectedIds.length === 0
      ? "Pilih outlet..."
      : selectedIds.length === outlets.length
        ? "Semua outlet"
        : outlets
            .filter((o) => selectedIds.includes(o.id))
            .map((o) => o.name)
            .join(", ");

  return (
    <Dialog open={!!staff} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Assign Role Outlet</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1">{staff?.name}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Outlet</Label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-full h-10 flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 text-sm text-left bg-white hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <span className={`truncate ${selectedIds.length === 0 ? "text-gray-400" : "text-gray-800"}`}>
                  {selectedLabel}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {outlets.map((o) => {
                    const checked = selectedIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggleOutlet(o.id)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          checked ? "bg-emerald-50 text-emerald-800 font-medium" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>{o.name}</span>
                        {checked && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedIds.length === 0 && (
              <p className="text-xs text-amber-600">Pilih minimal satu outlet</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Role di Outlet yang Dipilih</Label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "STORE_MANAGER" | "CASHIER")
              }
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="CASHIER">Kasir</option>
              <option value="STORE_MANAGER">Manager</option>
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
              disabled={pending || selectedIds.length === 0}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                `Simpan (${selectedIds.length} outlet)`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
