"use client";

import { useState } from "react";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportAssets } from "@/actions/import-export";

type FilterOption = { id: string; name: string };

export function ExportClient({
  categories,
  conditions,
  years,
}: {
  categories: FilterOption[];
  conditions: FilterOption[];
  years: number[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [conditionId, setConditionId] = useState("");
  const [yearPurchased, setYearPurchased] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const filters: { categoryId?: string; conditionId?: string; yearPurchased?: number } = {};
      if (categoryId) filters.categoryId = categoryId;
      if (conditionId) filters.conditionId = conditionId;
      if (yearPurchased) filters.yearPurchased = parseInt(yearPurchased, 10);

      const res = await exportAssets(filters);
      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal mengekspor");
        return;
      }

      // Download
      const byteChars = atob(res.data);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_aset_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("File berhasil diunduh");
    } catch {
      toast.error("Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">
          Export Aset
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Unduh data aset dalam format Excel (.xlsx)
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-xs p-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Filter (Opsional)
        </h2>

        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kondisi</Label>
            <Select value={conditionId} onValueChange={(v) => setConditionId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Semua kondisi" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tahun Pembelian</Label>
            <Select value={yearPurchased} onValueChange={(v) => setYearPurchased(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Semua tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(categoryId || conditionId || yearPurchased) && (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryId("");
                setConditionId("");
                setYearPurchased("");
              }}
            >
              Reset Filter
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <FileSpreadsheet className="h-10 w-10 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-800 dark:text-white/90">
              Export ke Excel
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {categoryId || conditionId || yearPurchased
                ? "Data akan difilter sesuai pilihan di atas"
                : "Semua data aset aktif akan diekspor"}
            </p>
          </div>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Mengekspor..." : "Download Excel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
