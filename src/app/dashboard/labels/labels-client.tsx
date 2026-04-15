"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { Printer, CheckSquare, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LabelPdfPreview = dynamic(() => import("./label-pdf").then((m) => m.LabelPdfPreview), {
  ssr: false,
  loading: () => <p className="text-center text-muted-foreground p-8">Memuat preview PDF...</p>,
});

type AssetItem = {
  id: string;
  assetCode: string;
  name: string;
  qrToken: string;
  yearPurchased: number | null;
  category: { name: string };
};

type Props = {
  assets: AssetItem[];
  institutionName: string;
  appUrl: string;
  logoUrl?: string | null;
};

export function LabelsClient({ assets, institutionName, appUrl, logoUrl }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.assetCode.toLowerCase().includes(q)
    );
  }, [assets, search]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  }

  async function handlePrint() {
    const selectedAssets = assets.filter((a) => selected.has(a.id));
    const urls: Record<string, string> = {};

    for (const asset of selectedAssets) {
      const url = `${appUrl}/verify/${asset.qrToken}`;
      urls[asset.id] = await QRCode.toDataURL(url, { width: 150, margin: 1 });
    }

    setQrDataUrls(urls);
    setShowPreview(true);
  }

  const selectedAssets = assets.filter((a) => selected.has(a.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cetak Label QR</h1>
          <p className="text-sm text-muted-foreground">
            Pilih aset untuk mencetak label QR Code
          </p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={selected.size === 0}
        >
          <Printer className="mr-2 h-4 w-4" />
          Cetak Label ({selected.size})
        </Button>
      </div>

      <Input
        placeholder="Cari nama atau kode aset..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <button onClick={toggleAll}>
                  {selected.size === filtered.length && filtered.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Kode Aset</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((asset) => (
              <TableRow
                key={asset.id}
                className="cursor-pointer"
                onClick={() => toggleSelect(asset.id)}
              >
                <TableCell>
                  {selected.has(asset.id) ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {asset.assetCode}
                </TableCell>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.category.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showPreview && selectedAssets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Preview PDF</h2>
          <LabelPdfPreview
            assets={selectedAssets}
            qrDataUrls={qrDataUrls}
            institutionName={institutionName}
            logoUrl={logoUrl}
          />
        </div>
      )}
    </div>
  );
}
