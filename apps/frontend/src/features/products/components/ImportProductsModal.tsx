'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { Upload, X, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toastSuccess, errorAlert } from '@/lib/swal';

interface ImportProductsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportProductsModal({ open, onClose, onSuccess }: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [result, setResult] = useState<any>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
      setPreview([]);
      setErrors([]);
      setResult(null);
    } else {
      errorAlert('File harus format CSV');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview([]);
      setErrors([]);
      setResult(null);
    }
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const template = `name,category,sku,price,cost,description,barcode,stock,min_stock,is_active,variants
Kopi Americano,Minuman,kopi-americano,18000,9000,Kopi americano khas,1234567890,100,10,true,
Kopi Latte,Minuman,kopi-latte,22000,11000,Kopi latte creamy,1234567891,100,10,true,Size|Regular|Large
Teh Manis,Minuman,teh-manis,8000,4000,Teh manis segerr,1234567892,200,20,true,Level|Normal|Less|No Ice
Nasi Goreng,Makanan,nasi-goreng,25000,12000,Nasi goreng spesial,1234567893,50,5,true,
Roti Bakar,Makanan,roti-bakar,15000,7500,Roti bakar selai,1234567894,60,10,true,Topping|Keju|Coklat`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_produk.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/products/import', formData);
      setPreview(data.products ?? []);
      setErrors(data.errors ?? []);
    } catch (err: any) {
      errorAlert(err?.response?.data?.message || err.message || 'Gagal upload file');
    } finally {
      setIsUploading(false);
    }
  }, [file]);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/products/import', formData);
      setResult(data);
      toastSuccess(`Berhasil import ${data.successCount} produk`);
      onSuccess();
    } catch (err: any) {
      errorAlert(err?.response?.data?.message || err.message || 'Gagal import produk');
    } finally {
      setIsProcessing(false);
    }
  }, [file, onSuccess]);

  const handleClose = useCallback(() => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    setResult(null);
    onClose();
  }, [onClose]);

  const hasErrors = errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Import Produk dari CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Download Template */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="size-4 mr-2" />
              Download Template CSV
            </Button>
          </div>

          {/* Drop Zone */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="size-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drag & drop file CSV di sini, atau
              </p>
              <label className="cursor-pointer">
                <span className="text-emerald-600 font-medium hover:underline">pilih file</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          )}

          {/* File Selected */}
          {file && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Upload className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium {...existing...}">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="size-5" />
                </button>
              </div>

              {/* Preview or Upload Button */}
              {preview.length > 0 ? (
                <div className="space-y-3">
                  {/* Preview Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Nama</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((p, i) => (
                          <tr key={i} className={`border-t ${errors.some(e => e.row === i + 1) ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2">{p.name}</td>
                            <td className="px-3 py-2 font-mono">{p.sku}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="size-3" />
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Errors */}
                  {errors.length > 0 && (
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <p className="text-sm font-medium text-red-700 mb-2">
                        {errors.length} error ditemukan:
                      </p>
                      <ul className="space-y-1">
                        {errors.slice(0, 5).map((err, i) => (
                          <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                            <AlertCircle className="size-3 mt-0.5 shrink-0" />
                            <span>Row {err.row}: {err.message}</span>
                          </li>
                        ))}
                        {errors.length > 5 && (
                          <li className="text-xs text-red-500">...dan {errors.length - 5} error lainnya</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setFile(null)}>
                      Ganti File
                    </Button>
                    <Button onClick={handleImport} disabled={hasErrors || isProcessing}>
                      {isProcessing ? 'Mengimport...' : 'Import Sekarang'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                  {isUploading ? 'Memproses...' : 'Proses CSV'}
                </Button>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="border rounded-xl p-6 bg-emerald-50 dark:bg-emerald-900/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="size-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-700">Import Berhasil!</p>
                    <p className="text-sm text-emerald-600">
                      {result.successCount} dari {result.totalRows} produk berhasil diimport
                    </p>
                  </div>
                </div>
              </div>

              {result.errorCount > 0 && (
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                  <p className="text-sm font-medium text-amber-700 mb-2">
                    {result.errorCount} produk gagal diimport
                  </p>
                  <ul className="space-y-1">
                    {result.errors.slice(0, 5).map((err: any, i: number) => (
                      <li key={i} className="text-xs text-amber-600">
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Tutup
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
