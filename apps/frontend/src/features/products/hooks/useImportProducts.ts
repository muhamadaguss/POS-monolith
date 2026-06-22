import { useState } from 'react';
import type { ProductListItem } from '../types';

interface ImportProductsResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string; data: any }>;
  products: Array<{ id: string; name: string; sku: string; status: string }>;
}

export function useImportProducts() {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const uploadCSV = async (file: File): Promise<boolean> => {
    setIsUploading(true);
    setPreview([]);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/products/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload gagal');
      }

      const result = await response.json();

      if (result.success) {
        setPreview(result.data.products.map((p: any) => ({
          name: p.name,
          sku: p.sku,
          price: 'Rp ' + parseInt(p.name).toLocaleString('id-ID'),
        })));
        setErrors(result.data.errors);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Upload error:', err);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const processImport = async (): Promise<ImportProductsResult | null> => {
    if (preview.length === 0) return null;

    setIsLoading(true);
    try {
      const formData = new FormData();
      // Process preview data to create CSV string
      const csvContent = preview.map((row) => ({
        name: row.name,
        category: row.category || '',
        sku: row.sku,
        price: row.price,
        cost: row.cost || '',
        description: row.description || '',
        barcode: row.barcode || '',
        stock: row.stock || '',
        min_stock: row.min_stock || '',
        is_active: row.is_active || 'true',
        variants: row.variants || '',
      }));

      const csv = [
        Object.keys(csvContent[0]).join(','),
        ...csvContent.map((row) =>
          Object.values(row).map((v) => `"${v}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const file = new File([blob], 'products.csv', { type: 'text/csv' });

      const formDataWithFile = new FormData();
      formDataWithFile.append('file', file);

      const response = await fetch('/api/v1/products/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formDataWithFile,
      });

      if (!response.ok) {
        throw new Error('Import gagal');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      console.error('Import error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isUploading,
    isLoading,
    preview,
    errors,
    uploadCSV,
    processImport,
  };
}
