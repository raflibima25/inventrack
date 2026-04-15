"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Download,
  ArrowLeft,
  ArrowLeftRight,
  Calendar,
  User,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteAsset } from "@/actions/assets";

type AssetData = {
  id: string;
  assetCode: string;
  qrToken: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  yearAcquired: number | null;
  yearPurchased: number | null;
  vendor: string | null;
  userName: string | null;
  userPosition: string | null;
  description: string | null;
  itemCode: string | null;
  nup: string | null;
  acquisitionValue: number | null;
  depreciation: number | null;
  createdAt: string;
  updatedAt: string;
  category: { name: string; codePrefix: string };
  condition: { name: string; severityLevel: number };
  fundSource: { name: string } | null;
  location: { name: string; building: string | null; floor: string | null } | null;
  creator: { name: string };
  photos: { id: string; filePath: string; fileName: string; isPrimary: boolean }[];
  mutations: {
    id: string;
    fromUser: string | null;
    toUser: string;
    fromPosition: string | null;
    toPosition: string | null;
    mutationDate: string;
    notes: string | null;
    creator: { name: string };
  }[];
};

type Props = {
  asset: AssetData;
  appUrl: string;
  appName: string;
  isAdmin: boolean;
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value || "-"}</dd>
    </div>
  );
}

export function AssetDetail({ asset, appUrl, appName, isAdmin }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const verifyUrl = `${appUrl}/verify/${asset.qrToken}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, verifyUrl, { width: 200, margin: 2 });
    }
    QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 }).then(setQrDataUrl);
  }, [verifyUrl]);

  function downloadQR() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `QR-${asset.assetCode}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function conditionVariant(severity: number) {
    if (severity <= 1) return "default" as const;
    if (severity <= 2) return "secondary" as const;
    if (severity <= 3) return "destructive" as const;
    return "outline" as const;
  }

  const locationText = asset.location
    ? [
        asset.location.name,
        asset.location.building,
        asset.location.floor ? `Lt.${asset.location.floor}` : null,
      ]
        .filter(Boolean)
        .join(" - ")
    : null;

  function formatRp(val: number | null | undefined): string | null {
    if (val == null) return null;
    return `Rp ${val.toLocaleString("id-ID")}`;
  }

  const nilaiPerolehan = asset.acquisitionValue ? Number(asset.acquisitionValue) : null;
  const penyusutan = asset.depreciation ? Number(asset.depreciation) : null;
  const nilaiBuku =
    nilaiPerolehan != null && penyusutan != null ? nilaiPerolehan - penyusutan : null;

  const printInfoRows: [string, string | null | undefined][] = [
    ["Kode Aset", asset.assetCode],
    ["Kode Barang", asset.itemCode],
    ["NUP", asset.nup],
    ["Kategori", asset.category.name],
    ["Merk", asset.brand],
    ["Type/Model", asset.model],
    ["Serial Number", asset.serialNumber],
    ["Kondisi", asset.condition.name],
    ["Tahun Barang", asset.yearAcquired?.toString()],
    ["Tahun Pembelian", asset.yearPurchased?.toString()],
    ["Asal Perolehan", asset.fundSource?.name],
    ["Nilai Perolehan", formatRp(nilaiPerolehan)],
    ["Penyusutan", formatRp(penyusutan)],
    ["Nilai Buku", formatRp(nilaiBuku)],
    ["Vendor", asset.vendor],
    ["Lokasi", locationText],
    ["Pengguna", asset.userName],
    ["Jabatan", asset.userPosition],
    ["Keterangan", asset.description],
    ["Dibuat oleh", asset.creator.name],
    [
      "Tanggal Input",
      new Date(asset.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    ],
    [
      "Terakhir Diupdate",
      new Date(asset.updatedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    ],
  ];

  // ── Print layout (rendered via portal to document.body) ──────────────
  const printLayout = (
    <div
      style={{
        fontFamily: "Arial, 'Segoe UI', sans-serif",
        color: "#111827",
        background: "#fff",
        padding: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "10pt",
          marginBottom: "14pt",
        }}
      >
        <div style={{ fontSize: "20pt", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
          {asset.name}
        </div>
        <div
          style={{
            fontSize: "10pt",
            color: "#6b7280",
            fontFamily: "monospace",
            marginTop: "4pt",
          }}
        >
          {asset.assetCode}
        </div>
      </div>

      {/* Photo + QR side by side */}
      <div
        style={{
          display: "flex",
          gap: "16pt",
          marginBottom: "16pt",
          alignItems: "flex-start",
        }}
      >
        {asset.photos.length > 0 ? (
          <div
            style={{
              flex: "0 0 60%",
              border: "1px solid #e5e7eb",
              borderRadius: "4pt",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.photos[0].filePath}
              alt={asset.name}
              style={{
                width: "100%",
                maxHeight: "180pt",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              flex: "0 0 60%",
              height: "120pt",
              border: "1px dashed #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: "9pt",
            }}
          >
            Tidak ada foto
          </div>
        )}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: "9pt",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "6pt",
            }}
          >
            QR Code Verifikasi
          </div>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR Code"
              style={{ width: "100pt", height: "100pt", display: "block", margin: "0 auto" }}
            />
          )}
          <div
            style={{
              fontSize: "7pt",
              color: "#6b7280",
              wordBreak: "break-all",
              marginTop: "6pt",
              lineHeight: 1.3,
            }}
          >
            {verifyUrl}
          </div>
        </div>
      </div>

      {/* Detail Info Table */}
      <div style={{ marginBottom: "16pt" }}>
        <div
          style={{
            fontSize: "12pt",
            fontWeight: 700,
            color: "#111827",
            borderBottom: "1.5pt solid #111827",
            paddingBottom: "4pt",
            marginBottom: "6pt",
          }}
        >
          Detail Aset
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
          <tbody>
            {printInfoRows.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: "0.5pt solid #e5e7eb" }}>
                <td
                  style={{
                    padding: "4pt 6pt 4pt 0",
                    color: "#6b7280",
                    width: "28%",
                    verticalAlign: "top",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "4pt 0",
                    color: "#111827",
                    fontWeight: 500,
                    verticalAlign: "top",
                  }}
                >
                  {value || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mutation History */}
      {asset.mutations.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "12pt",
              fontWeight: 700,
              color: "#111827",
              borderBottom: "1.5pt solid #111827",
              paddingBottom: "4pt",
              marginBottom: "6pt",
            }}
          >
            Riwayat Mutasi
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
            <thead>
              <tr style={{ borderBottom: "1pt solid #e5e7eb", background: "#f9fafb" }}>
                <th style={{ padding: "4pt 6pt 4pt 0", textAlign: "left", color: "#6b7280", fontWeight: 600 }}>
                  Tanggal
                </th>
                <th style={{ padding: "4pt 6pt", textAlign: "left", color: "#6b7280", fontWeight: 600 }}>
                  Dari
                </th>
                <th style={{ padding: "4pt 6pt", textAlign: "left", color: "#6b7280", fontWeight: 600 }}>
                  Ke
                </th>
                <th style={{ padding: "4pt 0", textAlign: "left", color: "#6b7280", fontWeight: 600 }}>
                  Catatan
                </th>
              </tr>
            </thead>
            <tbody>
              {asset.mutations.map((m) => (
                <tr key={m.id} style={{ borderBottom: "0.5pt solid #e5e7eb" }}>
                  <td style={{ padding: "4pt 6pt 4pt 0", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {new Date(m.mutationDate).toLocaleDateString("id-ID")}
                  </td>
                  <td style={{ padding: "4pt 6pt", verticalAlign: "top" }}>
                    {m.fromUser || "(Baru)"}
                  </td>
                  <td style={{ padding: "4pt 6pt", verticalAlign: "top" }}>
                    {m.toUser}
                    {m.toPosition && (
                      <div style={{ color: "#6b7280", fontSize: "8pt" }}>{m.toPosition}</div>
                    )}
                  </td>
                  <td style={{ padding: "4pt 0", verticalAlign: "top", color: "#6b7280" }}>
                    {m.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "16pt",
          paddingTop: "8pt",
          borderTop: "1pt solid #e5e7eb",
          fontSize: "8pt",
          color: "#9ca3af",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Dicetak dari {appName}</span>
        <span>
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Normal screen UI ─────────────────────────────────── */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{asset.name}</h1>
              <p className="font-mono text-sm text-muted-foreground">{asset.assetCode}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            {isAdmin && (
              <>
                <Link href={`/dashboard/assets/${asset.id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button variant="destructive" onClick={() => setShowDelete(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Photos */}
            {asset.photos.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="relative aspect-video overflow-hidden rounded-lg border">
                      <Image
                        src={asset.photos[selectedPhoto]?.filePath}
                        alt={asset.name}
                        fill
                        className="object-contain"
                        unoptimized
                        priority
                      />
                    </div>
                    {asset.photos.length > 1 && (
                      <div className="flex gap-2">
                        {asset.photos.map((photo, i) => (
                          <button
                            key={photo.id}
                            onClick={() => setSelectedPhoto(i)}
                            className={`relative h-16 w-16 overflow-hidden rounded-md border-2 ${
                              i === selectedPhoto ? "border-primary" : "border-transparent"
                            }`}
                          >
                            <Image
                              src={photo.filePath}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detail Aset</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  <InfoRow label="Kode Barang" value={asset.itemCode} />
                  <InfoRow label="NUP" value={asset.nup} />
                  <InfoRow label="Kategori" value={asset.category.name} />
                  <InfoRow label="Merk" value={asset.brand} />
                  <InfoRow label="Type/Model" value={asset.model} />
                  <InfoRow label="Serial Number" value={asset.serialNumber} />
                  <InfoRow label="Kondisi" value={asset.condition.name} />
                  <InfoRow label="Tahun Barang" value={asset.yearAcquired?.toString()} />
                  <InfoRow label="Tahun Pembelian" value={asset.yearPurchased?.toString()} />
                  <InfoRow label="Asal Perolehan" value={asset.fundSource?.name} />
                  <InfoRow label="Nilai Perolehan" value={formatRp(nilaiPerolehan)} />
                  <InfoRow label="Penyusutan" value={formatRp(penyusutan)} />
                  <InfoRow label="Nilai Buku" value={formatRp(nilaiBuku)} />
                  <InfoRow label="Vendor" value={asset.vendor} />
                  <InfoRow label="Lokasi" value={locationText} />
                  <InfoRow label="Pengguna" value={asset.userName} />
                  <InfoRow label="Jabatan" value={asset.userPosition} />
                  <InfoRow label="Keterangan" value={asset.description} />
                  <InfoRow label="Dibuat oleh" value={asset.creator.name} />
                  <InfoRow
                    label="Tanggal Input"
                    value={new Date(asset.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                  <InfoRow
                    label="Terakhir Diupdate"
                    value={new Date(asset.updatedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                </dl>
              </CardContent>
            </Card>

            {/* Mutation History */}
            {asset.mutations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Riwayat Mutasi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {asset.mutations.map((m) => (
                      <div key={m.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <ArrowLeftRight className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 w-px bg-border" />
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium">
                            {m.fromUser || "(Baru)"} → {m.toUser}
                          </p>
                          {m.toPosition && (
                            <p className="text-xs text-muted-foreground">
                              Jabatan: {m.toPosition}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(m.mutationDate).toLocaleDateString("id-ID")}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {m.creator.name}
                            </span>
                          </div>
                          {m.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* QR Code Sidebar */}
          <div className="space-y-6">
            <Card id="qr">
              <CardHeader>
                <CardTitle className="text-lg">QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <canvas ref={canvasRef} />
                <p className="text-center text-xs text-muted-foreground break-all">
                  {verifyUrl}
                </p>
                <Button onClick={downloadQR} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download QR
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Kondisi</span>
                  <Badge variant={conditionVariant(asset.condition.severityLevel)}>
                    {asset.condition.name}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Kategori</span>
                  <span className="text-sm">{asset.category.name}</span>
                </div>
                {asset.location && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Lokasi</span>
                      <span className="text-sm">{asset.location.name}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <ConfirmDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          title="Hapus Aset"
          description={`Aset "${asset.name}" akan dipindahkan ke sampah.`}
          onConfirm={async () => {
            const result = await deleteAsset(asset.id);
            if (result.success) {
              toast.success("Aset berhasil dihapus");
              router.push("/dashboard/assets");
            } else {
              toast.error(result.error);
            }
          }}
        />
      </div>

      {/* ── Print area: rendered via portal directly into <body> ────────
          Because it's a direct child of body, CSS can cleanly target
          `body > *:not(#print-area) { display: none }` with no blank pages.
          ─────────────────────────────────────────────────────────────── */}
      {mounted && createPortal(<div id="print-area">{printLayout}</div>, document.body)}
    </>
  );
}
