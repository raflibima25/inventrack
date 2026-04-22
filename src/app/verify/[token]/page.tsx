import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, AlertTriangle, Info, MapPin, DollarSign } from "lucide-react";
import { PhotoCarousel } from "@/components/shared/photo-carousel";
import { getAppSettings } from "@/actions/settings";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatRupiah(value: any): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const asset = await prisma.asset.findUnique({
    where: { qrToken: token },
    include: {
      category: true,
      condition: true,
      fundSource: true,
      location: true,
      photos: { orderBy: { isPrimary: "desc" } },
      creator: true,
    },
  });

  // Log the scan
  if (asset) {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "";

    await prisma.scanLog.create({
      data: {
        assetId: asset.id,
        ipAddress: ip,
        userAgent,
      },
    });
  }

  if (!asset || asset.deletedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Aset Tidak Ditemukan</h1>
            <p className="text-sm text-muted-foreground">
              QR Code ini tidak terdaftar dalam sistem atau aset telah dihapus.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const settings = await getAppSettings();
  const institutionName = settings.institutionName;

  function conditionColor(severity: number) {
    if (severity <= 1) return "bg-green-100 text-green-800";
    if (severity <= 2) return "bg-yellow-100 text-yellow-800";
    if (severity <= 3) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  }

  // Hitung Nilai Buku
  const bookValue =
    asset.acquisitionValue !== null && asset.depreciation !== null
      ? Number(asset.acquisitionValue) - Number(asset.depreciation)
      : null;

  function formatBookValue(value: number | null): string {
    if (value === null) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary px-4 py-4 text-primary-foreground">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <ShieldCheck className="h-6 w-6" />
          <div>
            <p className="text-sm font-medium">Aset Terverifikasi</p>
            <p className="text-xs opacity-80">{institutionName}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        {/* Photos Carousel */}
        <PhotoCarousel photos={asset.photos} assetName={asset.name} />

        {/* Identitas Aset */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Info className="h-4 w-4" />
              Identitas Aset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">Kode Aset</p>
              <p className="font-mono text-lg font-bold">{asset.assetCode}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Kode Barang</p>
                <p className="text-sm font-mono">{asset.itemCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NUP</p>
                <p className="text-sm">{asset.nup || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nama Barang</p>
              <p className="font-medium">{asset.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Kategori</p>
                <p className="text-sm">{asset.category.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kondisi</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${conditionColor(
                    asset.condition.severityLevel
                  )}`}
                >
                  {asset.condition.name}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Merk</p>
                <p className="text-sm">{asset.brand || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type/Model</p>
                <p className="text-sm">{asset.model || "-"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Serial Number</p>
              <p className="font-mono text-sm">{asset.serialNumber || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Detail Aset */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Info className="h-4 w-4" />
              Detail Aset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Tahun Barang</p>
                <p className="text-sm">{asset.yearAcquired ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tahun Pembelian</p>
                <p className="text-sm">{asset.yearPurchased ?? "-"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Asal Perolehan</p>
              <p className="text-sm">{asset.fundSource?.name ?? "-"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Vendor</p>
              <p className="text-sm">{asset.vendor || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Nilai Keuangan */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <DollarSign className="h-4 w-4" />
              Nilai Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">Nilai Perolehan</p>
              <p className="text-sm font-medium">
                {formatRupiah(asset.acquisitionValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Penyusutan</p>
              <p className="text-sm font-medium text-red-600">
                {formatRupiah(asset.depreciation)}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Nilai Buku</p>
              <p className="text-sm font-bold text-primary">
                {formatBookValue(bookValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lokasi & Pengguna */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <MapPin className="h-4 w-4" />
              Lokasi &amp; Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">Lokasi</p>
              <p className="text-sm">
                {asset.location
                  ? `${asset.location.name}${
                      asset.location.building
                        ? ` - ${asset.location.building}`
                        : ""
                    }${
                      asset.location.floor
                        ? ` - Lt.${asset.location.floor}`
                        : ""
                    }`
                  : "-"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Pengguna</p>
                <p className="text-sm">{asset.userName || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jabatan</p>
                <p className="text-sm">{asset.userPosition || "-"}</p>
              </div>
            </div>

            {asset.description && (
              <div>
                <p className="text-xs text-muted-foreground">Keterangan</p>
                <p className="text-sm">{asset.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Riwayat Input */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Dibuat oleh</p>
                <p className="text-sm font-medium">{asset.creator.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tanggal Input</p>
                <p className="text-sm">{formatDate(asset.createdAt)}</p>
              </div>
            </div>
            <Separator />
            <p className="text-center text-xs text-muted-foreground">
              Terakhir diperbarui: {formatDate(asset.updatedAt)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
