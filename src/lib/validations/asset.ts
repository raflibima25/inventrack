import { z } from "zod";

export const assetSchema = z.object({
  name: z.string().min(1, "Nama barang wajib diisi").max(255),
  categoryId: z.string().uuid("Kategori wajib dipilih"),
  brand: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  serialNumber: z.string().max(100).optional().or(z.literal("")),
  yearAcquired: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal("")),
  yearPurchased: z.coerce.number().int().min(1900, "Tahun pembelian wajib diisi").max(2100, "Tahun tidak valid").optional().or(z.literal("")),
  fundSourceId: z.string().uuid().optional().or(z.literal("")),
  vendor: z.string().max(200).optional().or(z.literal("")),
  userName: z.string().max(100).optional().or(z.literal("")),
  userPosition: z.string().max(100).optional().or(z.literal("")),
  locationId: z.string().uuid().optional().or(z.literal("")),
  conditionId: z.string().uuid("Kondisi wajib dipilih"),
  description: z.string().max(2000).optional().or(z.literal("")),
  // New fields
  itemCode: z.string().max(50).optional().or(z.literal("")),
  nup: z.string().max(50).optional().or(z.literal("")),
  acquisitionValue: z.coerce.number().nonnegative("Nilai tidak boleh negatif").optional().or(z.literal("")),
  depreciation: z.coerce.number().nonnegative("Nilai tidak boleh negatif").optional().or(z.literal("")),
});

export type AssetFormData = z.infer<typeof assetSchema>;

