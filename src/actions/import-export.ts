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
  kode_barang?: string;
  nup?: string;
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
  nilai_perolehan?: number;
  penyusutan?: number;
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

/** Extract a cell value from an ExcelJS row by matching against multiple header aliases. */
function getCell(
  row: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return undefined;
}

export async function importAssets(formData: FormData): Promise<ActionResult<ImportResult>> {
  try {
    const user = await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "File wajib diunggah" };

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { success: false, error: "File kosong atau format tidak sesuai" };
    }

    // Read header row to build a column-name → column-index map
    const headerRow = worksheet.getRow(1);
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const headerVal = String(cell.value ?? "").trim();
      if (headerVal) headerMap[headerVal.toLowerCase()] = colNumber;
    });

    // Convert all data rows (skip header) to plain objects keyed by header name
    const rawRows: Record<string, unknown>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const obj: Record<string, unknown> = {};
      Object.entries(headerMap).forEach(([header, colIdx]) => {
        const cell = row.getCell(colIdx);
        obj[header] = cell.value;
      });
      rawRows.push(obj);
    });

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
      const lower = value.toLowerCase().trim();
      return list.find((item) => item.name.toLowerCase() === lower);
    }

    // Preload existing serial numbers
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
      const rowNum = i + 2; // Excel row number (1-indexed + header)
      const raw = rawRows[i];

      const row: ImportRow = {
        nama_barang: getCell(raw, "nama_barang", "nama barang") ?? "",
        kategori:    getCell(raw, "kategori") ?? "",
        kode_barang: getCell(raw, "kode_barang", "kode barang"),
        nup:         getCell(raw, "nup"),
        merk:        getCell(raw, "merk"),
        type_model:  getCell(raw, "type_model", "type/model"),
        serial_number: getCell(raw, "serial_number", "serial number"),
        tahun_barang:  getCell(raw, "tahun_barang", "tahun barang") ? Number(getCell(raw, "tahun_barang", "tahun barang")) : undefined,
        tahun_pembelian: getCell(raw, "tahun_pembelian", "tahun pembelian") ? Number(getCell(raw, "tahun_pembelian", "tahun pembelian")) : undefined,
        sumber_dana: getCell(raw, "sumber_dana", "sumber dana", "asal perolehan"),
        vendor:      getCell(raw, "vendor"),
        pengguna:    getCell(raw, "pengguna"),
        jabatan:     getCell(raw, "jabatan"),
        kondisi:     getCell(raw, "kondisi") ?? "",
        keterangan:  getCell(raw, "keterangan"),
        nilai_perolehan: getCell(raw, "nilai_perolehan", "nilai perolehan") ? Number(getCell(raw, "nilai_perolehan", "nilai perolehan")) : undefined,
        penyusutan:  getCell(raw, "penyusutan") ? Number(getCell(raw, "penyusutan")) : undefined,
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

      const fundSource = row.sumber_dana
        ? matchMaster(fundSources, row.sumber_dana)
        : undefined;
      if (row.sumber_dana && !fundSource) {
        errors.push({ row: rowNum, message: `Sumber dana "${row.sumber_dana}" tidak ditemukan` });
        continue;
      }

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
            itemCode: row.kode_barang || null,
            nup: row.nup || null,
            acquisitionValue: row.nilai_perolehan ?? null,
            depreciation: row.penyusutan ?? null,
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
        errors: errors.slice(0, 50),
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

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Aset");

    // Define columns with headers and widths
    const columns = [
      { header: "Kode Aset",       key: "kodeAset",        width: 18 },
      { header: "Kode Barang",     key: "kodeBarang",      width: 18 },
      { header: "Nama Barang",     key: "namaBarang",      width: 30 },
      { header: "NUP",             key: "nup",             width: 10 },
      { header: "Kategori",        key: "kategori",        width: 20 },
      { header: "Merk",            key: "merk",            width: 18 },
      { header: "Type/Model",      key: "typeModel",       width: 18 },
      { header: "Serial Number",   key: "serialNumber",   width: 22 },
      { header: "Tahun Barang",    key: "tahunBarang",    width: 14 },
      { header: "Asal Perolehan",  key: "asalPerolehan",  width: 18 },
      { header: "Tahun Perolehan", key: "tahunPerolehan", width: 16 },
      { header: "Nilai Perolehan", key: "nilaiPerolehan", width: 18 },
      { header: "Penyusutan",      key: "penyusutan",     width: 18 },
      { header: "Nilai Buku",      key: "nilaiBuku",      width: 18 },
      { header: "Vendor",          key: "vendor",         width: 20 },
      { header: "Pengguna",        key: "pengguna",       width: 22 },
      { header: "Jabatan",         key: "jabatan",        width: 22 },
      { header: "Kondisi",         key: "kondisi",        width: 16 },
      { header: "Lokasi",          key: "lokasi",         width: 28 },
      { header: "Keterangan",      key: "keterangan",     width: 30 },
    ];
    worksheet.columns = columns;

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add data rows
    for (const a of assets) {
      const lokasi = a.location
        ? `${a.location.name}${a.location.building ? ` - ${a.location.building}` : ""}${a.location.floor ? ` Lt.${a.location.floor}` : ""}`
        : "";

      const acqVal = a.acquisitionValue ? Number(a.acquisitionValue) : null;
      const depVal = a.depreciation ? Number(a.depreciation) : null;
      const bookVal = acqVal != null && depVal != null ? acqVal - depVal : null;

      worksheet.addRow({
        kodeAset:       a.assetCode,
        kodeBarang:     a.itemCode ?? "",
        namaBarang:     a.name,
        nup:            a.nup ?? "",
        kategori:       a.category.name,
        merk:           a.brand ?? "",
        typeModel:      a.model ?? "",
        serialNumber:   a.serialNumber ?? "",
        tahunBarang:    a.yearAcquired ?? "",
        asalPerolehan:  a.fundSource?.name ?? "",
        tahunPerolehan: a.yearPurchased ?? "",
        nilaiPerolehan: acqVal ?? "",
        penyusutan:     depVal ?? "",
        nilaiBuku:      bookVal ?? "",
        vendor:         a.vendor ?? "",
        pengguna:       a.userName ?? "",
        jabatan:        a.userPosition ?? "",
        kondisi:        a.condition.name,
        lokasi,
        keterangan:     a.description ?? "",
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { success: true, data: base64 };
  } catch {
    return { success: false, error: "Gagal mengekspor data" };
  }
}

export async function getExportTemplate(): Promise<ActionResult<string>> {
  try {
    await requireAdmin();

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    const columns = [
      { header: "nama_barang",     key: "nama_barang",     width: 30 },
      { header: "kategori",        key: "kategori",        width: 20 },
      { header: "kode_barang",     key: "kode_barang",     width: 18 },
      { header: "nup",             key: "nup",             width: 10 },
      { header: "merk",            key: "merk",            width: 18 },
      { header: "type_model",      key: "type_model",      width: 18 },
      { header: "serial_number",   key: "serial_number",   width: 22 },
      { header: "tahun_barang",    key: "tahun_barang",    width: 14 },
      { header: "tahun_pembelian", key: "tahun_pembelian", width: 16 },
      { header: "sumber_dana",     key: "sumber_dana",     width: 18 },
      { header: "vendor",          key: "vendor",          width: 20 },
      { header: "pengguna",        key: "pengguna",        width: 22 },
      { header: "jabatan",         key: "jabatan",         width: 22 },
      { header: "kondisi",         key: "kondisi",         width: 16 },
      { header: "keterangan",      key: "keterangan",      width: 30 },
      { header: "nilai_perolehan", key: "nilai_perolehan", width: 18 },
      { header: "penyusutan",      key: "penyusutan",      width: 18 },
    ];
    worksheet.columns = columns;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add one empty example row so Excel doesn't open to a blank sheet
    worksheet.addRow({});

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { success: true, data: base64 };
  } catch {
    return { success: false, error: "Gagal membuat template" };
  }
}
