"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Search, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupAssetByQrToken, lookupAssetByCode } from "@/actions/scan";

export function ScannerClient({ appName = "InvenTrack" }: { appName?: string }) {
  const router = useRouter();
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5QrRef.current as { stop?: () => Promise<void> } | null;
      if (scanner && typeof scanner.stop === "function") {
        await scanner.stop();
      }
    } catch {
      // ignore
    }
    html5QrRef.current = null;
    setScanning(false);
  }, []);

  const handleQrResult = useCallback(
    async (decodedText: string) => {
      if (processing) return;
      setProcessing(true);

      try {
        // Extract qrToken from URL like https://domain/verify/{token}
        let token: string | null = null;
        try {
          const url = new URL(decodedText);
          const parts = url.pathname.split("/");
          const verifyIdx = parts.indexOf("verify");
          if (verifyIdx !== -1 && parts[verifyIdx + 1]) {
            token = parts[verifyIdx + 1];
          }
        } catch {
          // Not a URL — try as raw token (UUID format)
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedText)) {
            token = decodedText;
          }
        }

        if (!token) {
          toast.error(`QR Code tidak valid — bukan QR aset ${appName}`);
          setProcessing(false);
          return;
        }

        const asset = await lookupAssetByQrToken(token);
        if (!asset) {
          toast.error("Aset tidak ditemukan atau telah dihapus");
          setProcessing(false);
          return;
        }

        await stopScanner();
        router.push(`/dashboard/assets/${asset.id}`);
      } catch {
        toast.error("Gagal memproses QR Code");
        setProcessing(false);
      }
    },
    [processing, stopScanner, router]
  );

  const startScanner = useCallback(async () => {
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (!scannerRef.current) return;
      const scannerId = "qr-scanner-region";
      scannerRef.current.id = scannerId;

      const scanner = new Html5Qrcode(scannerId);
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          handleQrResult(decodedText);
        },
        () => {
          // ignore scan errors (no QR detected)
        }
      );

      setScanning(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setCameraError("Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.");
      } else if (msg.includes("NotFoundError") || msg.includes("device")) {
        setCameraError("Kamera tidak ditemukan pada perangkat ini.");
      } else {
        setCameraError(`Gagal mengakses kamera: ${msg}`);
      }
    }
  }, [handleQrResult]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  async function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;

    setManualLoading(true);
    try {
      const asset = await lookupAssetByCode(code);
      if (!asset) {
        toast.error("Aset tidak ditemukan");
        return;
      }
      router.push(`/dashboard/assets/${asset.id}`);
    } catch {
      toast.error("Gagal mencari aset");
    } finally {
      setManualLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">
          Scan QR Code
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Arahkan kamera ke QR Code aset atau masukkan kode aset manual
        </p>
      </div>

      {/* Camera Scanner */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-xs overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Kamera
            </h2>
            {!scanning ? (
              <Button onClick={startScanner} disabled={processing}>
                <Camera className="mr-2 h-4 w-4" />
                Mulai Scan
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanner}>
                <XCircle className="mr-2 h-4 w-4" />
                Berhenti
              </Button>
            )}
          </div>

          {cameraError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 mb-4">
              {cameraError}
            </div>
          )}

          {processing && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-600 dark:text-blue-400 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses QR Code...
            </div>
          )}

          <div
            ref={scannerRef}
            className={`mx-auto max-w-md overflow-hidden rounded-lg ${
              scanning ? "" : "hidden"
            }`}
          />

          {!scanning && !cameraError && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Camera className="h-16 w-16 mb-3 opacity-40" />
              <p className="text-sm">Klik &quot;Mulai Scan&quot; untuk mengaktifkan kamera</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Search */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-xs overflow-hidden">
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Cari Manual
          </h2>
          <form onSubmit={handleManualSearch} className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="assetCode">Kode Aset</Label>
              <Input
                id="assetCode"
                placeholder="Masukkan kode aset..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={manualLoading || !manualCode.trim()}>
              {manualLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Cari
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
