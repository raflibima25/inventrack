"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type ImportRow = {
  nama_barang: string;
  kategori: string;
  merk?: string;
  type_model?: string;
  serial_number?: string;
  tahun_barang?: number;
  tahun_pembelian?: number;
  sumber_dana?: string;
  vendor?: string;
  pengguna?: string;
  jabatan?: string;
  kondisi: string;
  keterangan?: string;
};

type ImportResult = {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
};

async function generateAssetCode(categoryId: string): Promise<string> {
  const category = await prisma.category.findUniqueOrThrow({
    where: { id: categoryId },
    select: { codePrefix: true },
  });

  const year = new Date().getFullYear();
  const prefix = `${category.codePrefix}-${year}`;

  const lastAsset = await prisma.asset.findFirst({
    where: { assetCode: { startsWith: prefix } },
    orderBy: { assetCode: "desc" },
    select: { assetCode: true },
  });

  let sequence = 1;
  if (lastAsset) {
    const lastSeq = parseInt(lastAsset.assetCode.split("-").pop() || "0", 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}

export async function importAssets(formData: FormData): Promise<ActionResult<ImportResult>> {
  try {
    const user = await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "File wajib diunggah" };

    const { read, utils } = await import("xlsx");

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rawRows.length === 0) {
      return { success: false, error: "File kosong atau format tidak sesuai" };
    }

    // Load master data for matching
    const [categories, conditions, fundSources] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.condition.findMany({ select: { id: true, name: true } }),
      prisma.fundSource.findMany({ select: { id: true, name: true } }),
    ]);

    function matchMaster<T extends { id: string; name: string }>(
      list: T[],
      value: string | undefined
    ): T | undefined {
      if (!value) return undefined;
      const lower = value.toString().toLowerCase().trim();
      return list.find((item) => item.name.toLowerCase() === lower);
    }

    // Check existing serial numbers
    const existingSerials = new Set(
      (
        await prisma.asset.findMany({
          where: { deletedAt: null, serialNumber: { not: null } },
          select: { serialNumber: true },
        })
      ).map((a) => a.serialNumber!.toLowerCase())
    );

    const errors: { row: number; message: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2; // Excel row (1-indexed + header)
      const raw = rawRows[i];

      // Normalize keys to snake_case lowercase
      const row: ImportRow = {
        nama_barang: String(raw["nama_barang"] ?? raw["Nama Barang"] ?? "").trim(),
        kategori: String(raw["kategori"] ?? raw["Kategori"] ?? "").trim(),
        merk: raw["merk"] ?? raw["Merk"] ? String(raw["merk"] ?? raw["Merk"]).trim() : undefined,
        type_model: raw["type_model"] ?? raw["Type/Model"] ? String(raw["type_model"] ?? raw["Type/Model"]).trim() : undefined,
        serial_number: raw["serial_number"] ?? raw["Serial Number"] ? String(raw["serial_number"] ?? raw["Serial Number"]).trim() : undefined,
        tahun_barang: raw["tahun_barang"] ?? raw["Tahun Barang"] ? Number(raw["tahun_barang"] ?? raw["Tahun Barang"]) : undefined,
        tahun_pembelian: raw["tahun_pembelian"] ?? raw["Tahun Pembelian"] ? Number(raw["tahun_pembelian"] ?? raw["Tahun Pembelian"]) : undefined,
        sumber_dana: raw["sumber_dana"] ?? raw["Sumber Dana"] ? String(raw["sumber_dana"] ?? raw["Sumber Dana"]).trim() : undefined,
        vendor: raw["vendor"] ?? raw["Vendor"] ? String(raw["vendor"] ?? raw["Vendor"]).trim() : undefined,
        pengguna: raw["pengguna"] ?? raw["Pengguna"] ? String(raw["pengguna"] ?? raw["Pengguna"]).trim() : undefined,
        jabatan: raw["jabatan"] ?? raw["Jabatan"] ? String(raw["jabatan"] ?? raw["Jabatan"]).trim() : undefined,
        kondisi: String(raw["kondisi"] ?? raw["Kondisi"] ?? "").trim(),
        keterangan: raw["keterangan"] ?? raw["Keterangan"] ? String(raw["keterangan"] ?? raw["Keterangan"]).trim() : undefined,
      };

      // Validate required fields
      if (!row.nama_barang) {
        errors.push({ row: rowNum, message: "Nama barang wajib diisi" });
        continue;
      }
      if (!row.kategori) {
        errors.push({ row: rowNum, message: "Kategori wajib diisi" });
        continue;
      }
      if (!row.kondisi) {
        errors.push({ row: rowNum, message: "Kondisi wajib diisi" });
        continue;
      }

      // Match master data
      const category = matchMaster(categories, row.kategori);
      if (!category) {
        errors.push({ row: rowNum, message: `Kategori "${row.kategori}" tidak ditemukan` });
        continue;
      }

      const condition = matchMaster(conditions, row.kondisi);
      if (!condition) {
        errors.push({ row: rowNum, message: `Kondisi "${row.kondisi}" tidak ditemukan` });
        continue;
      }

      const fundSource = row.sumber_dana ? matchMaster(fundSources, row.sumber_dana) : undefined;
      if (row.sumber_dana && !fundSource) {
        errors.push({ row: rowNum, message: `Sumber dana "${row.sumber_dana}" tidak ditemukan` });
        continue;
      }

      // Check serial number uniqueness
      if (row.serial_number) {
        const snLower = row.serial_number.toLowerCase();
        if (existingSerials.has(snLower)) {
          errors.push({ row: rowNum, message: `Serial number "${row.serial_number}" sudah ada` });
          continue;
        }
        existingSerials.add(snLower);
      }

      try {
        const assetCode = await generateAssetCode(category.id);

        await prisma.asset.create({
          data: {
            assetCode,
            name: row.nama_barang,
            categoryId: category.id,
            brand: row.merk || null,
            model: row.type_model || null,
            serialNumber: row.serial_number || null,
            yearAcquired: row.tahun_barang || null,
            yearPurchased: row.tahun_pembelian || null,
            fundSourceId: fundSource?.id || null,
            vendor: row.vendor || null,
            userName: row.pengguna || null,
            userPosition: row.jabatan || null,
            conditionId: condition.id,
            description: row.keterangan || null,
            createdBy: user.id!,
          },
        });

        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menyimpan";
        errors.push({ row: rowNum, message: msg });
      }
    }

    revalidatePath("/dashboard/assets");
    return {
      success: true,
      data: {
        totalRows: rawRows.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 50), // Limit error details
      },
    };
  } catch {
    return { success: false, error: "Gagal mengimpor data" };
  }
}

export async function exportAssets(filters?: {
  categoryId?: string;
  conditionId?: string;
  yearPurchased?: number;
}): Promise<ActionResult<string>> {
  try {
    await requireAdmin();

    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.conditionId) where.conditionId = filters.conditionId;
    if (filters?.yearPurchased) where.yearPurchased = filters.yearPurchased;

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: { select: { name: true } },
        condition: { select: { name: true } },
        fundSource: { select: { name: true } },
        location: { select: { name: true, building: true, floor: true } },
      },
      orderBy: { assetCode: "asc" },
    });

    const { utils, write } = await import("xlsx");

    const rows = assets.map((a) => ({
      "Kode Aset": a.assetCode,
      "Nama Barang": a.name,
      Kategori: a.category.name,
      Merk: a.brand || "",
      "Type/Model": a.model || "",
      "Serial Number": a.serialNumber || "",
      "Tahun Barang": a.yearAcquired || "",
      "Tahun Pembelian": a.yearPurchased || "",
      "Sumber Dana": a.fundSource?.name || "",
      Vendor: a.vendor || "",
      Pengguna: a.userName || "",
      Jabatan: a.userPosition || "",
      Kondisi: a.condition.name,
      Lokasi: a.location
        ? `${a.location.name}${a.location.building ? ` - ${a.location.building}` : ""}${a.location.floor ? ` Lt.${a.location.floor}` : ""}`
        : "",
      Keterangan: a.description || "",
    }));

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Aset");

    // Auto column widths
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] || "").length)).valueOf() + 2,
    }));
    ws["!cols"] = colWidths;

    const buf = write(wb, { type: "base64", bookType: "xlsx" });
    return { success: true, data: buf as string };
  } catch {
    return { success: false, error: "Gagal mengekspor data" };
  }
}

export async function getExportTemplate(): Promise<ActionResult<string>> {
  try {
    await requireAdmin();

    const { utils, write } = await import("xlsx");

    const headers = [
      {
        nama_barang: "",
        kategori: "",
        merk: "",
        type_model: "",
        serial_number: "",
        tahun_barang: "",
        tahun_pembelian: "",
        sumber_dana: "",
        vendor: "",
        pengguna: "",
        jabatan: "",
        kondisi: "",
        keterangan: "",
      },
    ];

    const ws = utils.json_to_sheet(headers);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template");

    const buf = write(wb, { type: "base64", bookType: "xlsx" });
    return { success: true, data: buf as string };
  } catch {
    return { success: false, error: "Gagal membuat template" };
  }
}
