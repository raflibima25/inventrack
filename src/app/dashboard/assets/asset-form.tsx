"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Upload, X, ImageIcon, Sparkles } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { assetSchema, type AssetFormData } from "@/lib/validations/asset";
import { createAsset, updateAsset, uploadAssetPhotos } from "@/actions/assets";
import { extractAssetFromImage } from "@/actions/extract";

type MasterItem = { id: string; name: string };
type CategoryItem = MasterItem & { codePrefix: string };
type ConditionItem = MasterItem & { severityLevel: number };
type LocationItem = MasterItem & { building: string | null; floor: string | null };

type PhotoPreview = {
  file: File;
  url: string;
};

type ExistingPhoto = {
  id: string;
  filePath: string;
  fileName: string;
};

type Props = {
  categories: CategoryItem[];
  conditions: ConditionItem[];
  fundSources: MasterItem[];
  locations: LocationItem[];
  defaultValues?: AssetFormData & { id: string };
  existingPhotos?: ExistingPhoto[];
};

export function AssetForm({
  categories,
  conditions,
  fundSources,
  locations,
  defaultValues,
  existingPhotos = [],
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!defaultValues?.id;
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());
  const [nullFields, setNullFields] = useState<Set<string>>(new Set());
  const [isDragOverExtract, setIsDragOverExtract] = useState(false);
  const [isDragOverPhoto, setIsDragOverPhoto] = useState(false);

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: defaultValues ?? {
      name: "",
      categoryId: "",
      brand: "",
      model: "",
      serialNumber: "",
      yearAcquired: "",
      yearPurchased: "",
      fundSourceId: "",
      vendor: "",
      userName: "",
      userPosition: "",
      locationId: "",
      conditionId: "",
      description: "",
      itemCode: "",
      nup: "",
      acquisitionValue: "",
      depreciation: "",
    },
  });

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const maxTotal = 5 - existingPhotos.length;

    if (photos.length + files.length > maxTotal) {
      toast.error(`Maksimal ${maxTotal} foto baru (sudah ada ${existingPhotos.length} foto)`);
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} melebihi 5MB`);
        return;
      }
    }

    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...previews]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function fuzzyMatchId(name: string | null, items: MasterItem[]): string {
    if (!name) return "";
    const lower = name.toLowerCase();
    const match = items.find((i) => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase()));
    return match?.id ?? "";
  }

  async function handleExtract(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    setExtractedFields(new Set());
    setNullFields(new Set());

    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await extractAssetFromImage(fd);

      if (!result.success || !result.data) {
        toast.error(result.error || "Gagal mengekstrak data");
        return;
      }

      const d = result.data;
      const filled = new Set<string>();
      const empty = new Set<string>();

      const setField = (key: string, formKey: keyof AssetFormData, value: string | number | null | undefined) => {
        if (value != null && value !== "") {
          form.setValue(formKey, value as never);
          filled.add(key);
        } else {
          empty.add(key);
        }
      };

      setField("name", "name", d.nama_barang);
      setField("brand", "brand", d.merk);
      setField("model", "model", d.type_model);
      setField("serialNumber", "serialNumber", d.serial_number);
      setField("vendor", "vendor", d.vendor);
      setField("userName", "userName", d.pengguna);
      setField("userPosition", "userPosition", d.jabatan);
      setField("description", "description", d.keterangan);
      setField("yearAcquired", "yearAcquired", d.tahun_barang);
      setField("yearPurchased", "yearPurchased", d.tahun_pembelian);

      // Fuzzy match master data
      const catId = fuzzyMatchId(d.kategori, categories);
      if (catId) { form.setValue("categoryId", catId); filled.add("categoryId"); } else { empty.add("categoryId"); }

      const condId = fuzzyMatchId(d.kondisi, conditions);
      if (condId) { form.setValue("conditionId", condId); filled.add("conditionId"); } else { empty.add("conditionId"); }

      const fundId = fuzzyMatchId(d.sumber_dana, fundSources);
      if (fundId) { form.setValue("fundSourceId", fundId); filled.add("fundSourceId"); } else { empty.add("fundSourceId"); }

      setExtractedFields(filled);
      setNullFields(empty);
      toast.success(`${filled.size} field berhasil diekstrak`);
    } catch {
      toast.error("Terjadi kesalahan saat mengekstrak");
    } finally {
      setIsExtracting(false);
      if (extractInputRef.current) extractInputRef.current.value = "";
    }
  }

  async function handleExtractDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOverExtract(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const valid = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!valid.includes(file.type)) {
      toast.error("Format tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.");
      return;
    }
    // Reuse handleExtract logic via synthetic event
    const dt = new DataTransfer();
    dt.items.add(file);
    if (extractInputRef.current) {
      extractInputRef.current.files = dt.files;
      extractInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function handlePhotoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOverPhoto(false);
    const files = Array.from(e.dataTransfer.files);
    const maxTotal = 5 - existingPhotos.length;
    const valid = ["image/jpeg", "image/png", "image/webp"];
    const filtered = files.filter((f) => {
      if (!valid.includes(f.type)) {
        toast.error(`${f.name}: format tidak didukung`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: melebihi 5MB`);
        return false;
      }
      return true;
    });
    if (photos.length + filtered.length > maxTotal) {
      toast.error(`Maksimal ${maxTotal} foto baru`);
      return;
    }
    const previews = filtered.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...previews]);
  }

  function fieldBorder(key: string) {
    if (extractedFields.has(key)) return "ring-2 ring-green-400/50";
    if (nullFields.has(key)) return "ring-2 ring-yellow-400/50";
    return "";
  }

  async function onSubmit(data: AssetFormData) {
    setIsSubmitting(true);
    try {
      let assetId: string;

      if (isEdit) {
        const result = await updateAsset(defaultValues!.id, data);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        assetId = defaultValues!.id;
        toast.success("Aset berhasil diperbarui");
      } else {
        const result = await createAsset(data);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        assetId = result.data!.id;
        toast.success(`Aset ${result.data!.assetCode} berhasil ditambahkan`);
      }

      // Upload photos if any
      if (photos.length > 0) {
        const fd = new FormData();
        for (const p of photos) fd.append("photos", p.file);
        const photoResult = await uploadAssetPhotos(assetId, fd);
        if (!photoResult.success) {
          toast.error(photoResult.error);
        }
      }

      router.push(`/dashboard/assets/${assetId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* AI Extraction */}
      {!isEdit && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-500" />
              <h3 className="font-semibold">Ekstrak Otomatis dari Gambar</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload foto/dokumen aset dan AI akan mengisi form secara otomatis
            </p>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOverExtract(true); }}
              onDragLeave={() => setIsDragOverExtract(false)}
              onDrop={handleExtractDrop}
              onClick={() => !isExtracting && extractInputRef.current?.click()}
              className={`
                flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-150 cursor-pointer
                ${
                  isDragOverExtract
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }
              `}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Mengekstrak data...</p>
                </>
              ) : (
                <>
                  <Upload className={`h-7 w-7 ${isDragOverExtract ? "text-brand-500" : "text-gray-400"}`} />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {isDragOverExtract ? "Lepaskan file di sini" : "Drag & drop file atau klik untuk pilih"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, WebP, PDF</p>
                </>
              )}
            </div>

            {extractedFields.size > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  {extractedFields.size} terisi
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  {nullFields.size} kosong
                </span>
              </div>
            )}

            <input
              ref={extractInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleExtract}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Informasi Dasar</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nama Barang <span className="text-destructive">*</span></Label>
              <Input id="name" className={fieldBorder("name")} {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Kategori <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch("categoryId")}
                onValueChange={(v) => form.setValue("categoryId", v ?? "")}
              >
                <SelectTrigger className={fieldBorder("categoryId")}>
                  <SelectValue placeholder="Pilih kategori">
                    {form.watch("categoryId")
                      ? (() => {
                          const cat = categories.find(c => c.id === form.watch("categoryId"));
                          return cat ? `${cat.name} (${cat.codePrefix})` : undefined;
                        })()
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.codePrefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.categoryId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Kondisi <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch("conditionId")}
                onValueChange={(v) => form.setValue("conditionId", v ?? "")}
              >
                <SelectTrigger className={fieldBorder("conditionId")}>
                  <SelectValue placeholder="Pilih kondisi">
                    {form.watch("conditionId")
                      ? conditions.find(c => c.id === form.watch("conditionId"))?.name
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.conditionId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.conditionId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Merk</Label>
              <Input id="brand" className={fieldBorder("brand")} {...form.register("brand")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Type/Model</Label>
              <Input id="model" className={fieldBorder("model")} {...form.register("model")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" className={fieldBorder("serialNumber")} {...form.register("serialNumber")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Penyedia</Label>
              <Input id="vendor" className={fieldBorder("vendor")} {...form.register("vendor")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Identifikasi & Registrasi</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="itemCode">Kode Barang</Label>
              <Input
                id="itemCode"
                placeholder="Contoh: 3100102003"
                {...form.register("itemCode")}
              />
              <p className="text-xs text-muted-foreground">
                Kode barang dari dokumen instansi (berbeda dengan kode aset sistem)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nup">NUP</Label>
              <Input
                id="nup"
                placeholder="Nomor Urut Pendaftaran"
                {...form.register("nup")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Tahun & Sumber Dana</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tahun Barang</Label>
              <Select
                value={String(form.watch("yearAcquired") || "")}
                onValueChange={(v) => form.setValue("yearAcquired", !v || v === "" ? "" : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tahun Pembelian <span className="text-destructive">*</span></Label>
              <Select
                value={String(form.watch("yearPurchased") || "")}
                onValueChange={(v) => form.setValue("yearPurchased", !v || v === "" ? "" : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.yearPurchased && (
                <p className="text-xs text-destructive">{form.formState.errors.yearPurchased.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Sumber Dana</Label>
              <Select
                value={form.watch("fundSourceId") || ""}
                onValueChange={(v) => form.setValue("fundSourceId", !v || v === "" ? "" : v)}
              >
                <SelectTrigger className={fieldBorder("fundSourceId")}>
                  <SelectValue placeholder="Pilih sumber dana">
                    {form.watch("fundSourceId")
                      ? fundSources.find(f => f.id === form.watch("fundSourceId"))?.name
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-</SelectItem>
                  {fundSources.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lokasi</Label>
              <Select
                value={form.watch("locationId") || ""}
                onValueChange={(v) => form.setValue("locationId", !v || v === "" ? "" : v)}
              >
                <SelectTrigger className={fieldBorder("locationId")}>
                  <SelectValue placeholder="Pilih lokasi">
                    {form.watch("locationId")
                      ? (() => {
                          const loc = locations.find(l => l.id === form.watch("locationId"));
                          if (!loc) return undefined;
                          return [loc.name, loc.building, loc.floor ? `Lt.${loc.floor}` : null]
                            .filter(Boolean).join(" - ");
                        })()
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-max max-w-sm">
                  <SelectItem value="">-</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="whitespace-normal break-words">
                      {l.name}
                      {l.building ? ` - ${l.building}` : ""}
                      {l.floor ? ` Lt.${l.floor}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Pengguna</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userName">Nama Pengguna</Label>
              <Input id="userName" className={fieldBorder("userName")} {...form.register("userName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPosition">Jabatan</Label>
              <Input id="userPosition" className={fieldBorder("userPosition")} {...form.register("userPosition")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Keterangan</Label>
            <Textarea
              id="description"
              rows={3}
              {...form.register("description")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Informasi Finansial</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="acquisitionValue">Nilai Perolehan</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  Rp
                </span>
                <Input
                  id="acquisitionValue"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  className="pl-9"
                  {...form.register("acquisitionValue")}
                />
              </div>
              {form.formState.errors.acquisitionValue && (
                <p className="text-xs text-destructive">{form.formState.errors.acquisitionValue.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="depreciation">Penyusutan</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  Rp
                </span>
                <Input
                  id="depreciation"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  className="pl-9"
                  {...form.register("depreciation")}
                />
              </div>
              {form.formState.errors.depreciation && (
                <p className="text-xs text-destructive">{form.formState.errors.depreciation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nilai Buku</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  Rp
                </span>
                <Input
                  readOnly
                  tabIndex={-1}
                  className="pl-9 bg-muted text-muted-foreground cursor-not-allowed"
                  value={(() => {
                    const acq = Number(form.watch("acquisitionValue") || 0);
                    const dep = Number(form.watch("depreciation") || 0);
                    if (!form.watch("acquisitionValue") && !form.watch("depreciation")) return "";
                    return (acq - dep).toLocaleString("id-ID");
                  })()}
                  placeholder="Otomatis (Nilai Perolehan - Penyusutan)"
                />
              </div>
              <p className="text-xs text-muted-foreground">Kalkulasi otomatis</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Foto Dokumentasi</h3>
          <p className="text-sm text-muted-foreground">
            Maksimal 5 foto, masing-masing maks 5MB (JPG, PNG, WEBP)
          </p>

          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {existingPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-lg border"
                >
                  <Image
                    src={photo.filePath}
                    alt={photo.fileName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOverPhoto(true); }}
            onDragLeave={() => setIsDragOverPhoto(false)}
            onDrop={handlePhotoDrop}
            className={`
              rounded-xl border-2 border-dashed p-4 transition-colors duration-150
              ${
                isDragOverPhoto
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-gray-200 dark:border-gray-700"
              }
            `}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg border"
                >
                  <Image
                    src={p.url}
                    alt={p.file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {existingPhotos.length + photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs">Tambah</span>
                </button>
              )}
            </div>
            {isDragOverPhoto && (
              <p className="mt-3 text-center text-sm font-medium text-brand-500">
                Lepaskan foto di sini
              </p>
            )}
            {!isDragOverPhoto && existingPhotos.length + photos.length < 5 && (
              <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
                Atau drag &amp; drop foto langsung ke area ini
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Simpan Perubahan" : "Simpan Aset"}
        </Button>
      </div>
    </form>
  );
}
