"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateAppSettings, updateAppLogo, removeAppLogo } from "@/actions/settings";

type Settings = {
  id: string;
  appName: string;
  institutionName: string;
  appDescription: string | null;
  logoUrl: string | null;
};

type Props = {
  settings: Settings;
};

export function SettingsForm({ settings }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [isDragOverLogo, setIsDragOverLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    const result = await updateAppSettings(formData);
    if (result.success) {
      toast.success("Pengaturan berhasil disimpan");
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processLogoFile(file);
  }

  async function handleRemoveLogo() {
    const result = await removeAppLogo();
    if (result.success) {
      setLogoPreview(null);
      toast.success("Logo berhasil dihapus");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function processLogoFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 2MB");
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format file tidak didukung. Gunakan JPG, PNG, WebP, atau SVG.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/settings/upload-logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Gagal mengupload logo"); return; }
      const result = await updateAppLogo(data.url);
      if (result.success) {
        setLogoPreview(data.url);
        toast.success("Logo berhasil diupload");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Gagal mengupload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLogoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOverLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processLogoFile(file);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Form Utama */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identitas Aplikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="appName">Nama Aplikasi</Label>
                <Input
                  id="appName"
                  name="appName"
                  defaultValue={settings.appName}
                  placeholder="Contoh: InvenTrack"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ditampilkan di sidebar, halaman login, dan footer.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institutionName">Nama Instansi</Label>
                <Input
                  id="institutionName"
                  name="institutionName"
                  defaultValue={settings.institutionName}
                  placeholder="Contoh: Kementerian Kelautan dan Perikanan"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ditampilkan di label QR Code dan halaman verifikasi aset.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appDescription">Deskripsi / Tagline</Label>
                <Textarea
                  id="appDescription"
                  name="appDescription"
                  defaultValue={settings.appDescription || ""}
                  placeholder="Contoh: Sistem manajemen inventaris & pelabelan aset berbasis QR Code"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Ditampilkan di halaman login sebagai deskripsi singkat.
                </p>
              </div>

              <Separator />

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Pengaturan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Logo Upload */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logo Instansi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <div className="relative h-32 w-32 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Image
                      src={logoPreview}
                      alt="Logo"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white shadow-sm hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOverLogo(true); }}
                onDragLeave={() => setIsDragOverLogo(false)}
                onDrop={handleLogoDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`
                  w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-150 cursor-pointer
                  ${
                    isDragOverLogo
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }
                `}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Mengupload...</p>
                  </>
                ) : (
                  <>
                    <Upload className={`h-7 w-7 ${isDragOverLogo ? "text-brand-500" : "text-gray-400"}`} />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {isDragOverLogo ? "Lepaskan file di sini" : "Drag & drop atau klik untuk pilih"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, WebP, SVG · Maks 2MB</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
