"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth-guard";
import { assetSchema, type AssetFormData } from "@/lib/validations/asset";
import { uploadFile, deleteFile } from "@/lib/storage";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function generateAssetCode(categoryId: string, yearPurchased: number): Promise<string> {
  const category = await prisma.category.findUniqueOrThrow({
    where: { id: categoryId },
    select: { codePrefix: true },
  });

  const prefix = `${category.codePrefix}-${yearPurchased}`;

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

async function logAudit(
  entityType: string,
  entityId: string,
  action: string,
  changedBy: string,
  changes?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      changedBy,
      changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
    },
  });
}

function cleanOptional(val: string | number | undefined): string | null {
  if (val === undefined || val === "") return null;
  return String(val);
}

function cleanOptionalInt(val: string | number | undefined): number | null {
  if (val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export async function createAsset(
  formData: AssetFormData
): Promise<ActionResult<{ id: string; assetCode: string }>> {
  try {
    const user = await requireAdmin();
    const parsed = assetSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const d = parsed.data;

    if (!d.yearPurchased) {
      return { success: false, error: "Tahun pembelian wajib diisi" };
    }

    // Check unique serial number
    if (d.serialNumber && d.serialNumber !== "") {
      const existing = await prisma.asset.findFirst({
        where: { serialNumber: d.serialNumber, deletedAt: null },
      });
      if (existing) {
        return { success: false, error: "Serial number sudah digunakan" };
      }
    }

    const assetCode = await generateAssetCode(d.categoryId, d.yearPurchased as number);

    const asset = await prisma.asset.create({
      data: {
        assetCode,
        name: d.name,
        categoryId: d.categoryId,
        brand: cleanOptional(d.brand),
        model: cleanOptional(d.model),
        serialNumber: cleanOptional(d.serialNumber),
        yearAcquired: cleanOptionalInt(d.yearAcquired),
        yearPurchased: d.yearPurchased as number,
        fundSourceId: cleanOptional(d.fundSourceId),
        vendor: cleanOptional(d.vendor),
        userName: cleanOptional(d.userName),
        userPosition: cleanOptional(d.userPosition),
        locationId: cleanOptional(d.locationId),
        conditionId: d.conditionId,
        description: cleanOptional(d.description),
        createdBy: user.id!,
      },
    });

    await logAudit("asset", asset.id, "CREATE", user.id!, {
      assetCode,
      name: d.name,
    });

    revalidatePath("/dashboard/assets");
    return { success: true, data: { id: asset.id, assetCode: asset.assetCode } };
  } catch (e) {
    console.error("createAsset error:", e);
    return { success: false, error: "Gagal menambahkan aset" };
  }
}

export async function updateAsset(
  id: string,
  formData: AssetFormData
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = assetSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const d = parsed.data;

    if (!d.yearPurchased) {
      return { success: false, error: "Tahun pembelian wajib diisi" };
    }

    const oldAsset = await prisma.asset.findUniqueOrThrow({ where: { id } });

    // Check unique serial number (exclude self)
    if (d.serialNumber && d.serialNumber !== "") {
      const existing = await prisma.asset.findFirst({
        where: {
          serialNumber: d.serialNumber,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existing) {
        return { success: false, error: "Serial number sudah digunakan" };
      }
    }

    const updateData = {
      name: d.name,
      categoryId: d.categoryId,
      brand: cleanOptional(d.brand),
      model: cleanOptional(d.model),
      serialNumber: cleanOptional(d.serialNumber),
      yearAcquired: cleanOptionalInt(d.yearAcquired),
      yearPurchased: d.yearPurchased as number,
      fundSourceId: cleanOptional(d.fundSourceId),
      vendor: cleanOptional(d.vendor),
      userName: cleanOptional(d.userName),
      userPosition: cleanOptional(d.userPosition),
      locationId: cleanOptional(d.locationId),
      conditionId: d.conditionId,
      description: cleanOptional(d.description),
    };

    await prisma.asset.update({ where: { id }, data: updateData });

    // Build changes diff
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, newVal] of Object.entries(updateData)) {
      const oldVal = (oldAsset as Record<string, unknown>)[key];
      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    if (Object.keys(changes).length > 0) {
      await logAudit("asset", id, "UPDATE", user.id!, changes);
    }

    revalidatePath("/dashboard/assets");
    revalidatePath(`/dashboard/assets/${id}`);
    return { success: true };
  } catch (e) {
    console.error("updateAsset error:", e);
    return { success: false, error: "Gagal memperbarui aset" };
  }
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();

    await prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit("asset", id, "DELETE", user.id!);
    revalidatePath("/dashboard/assets");
    return { success: true };
  } catch (e) {
    console.error("deleteAsset error:", e);
    return { success: false, error: "Gagal menghapus aset" };
  }
}

export async function restoreAsset(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();

    await prisma.asset.update({
      where: { id },
      data: { deletedAt: null },
    });

    await logAudit("asset", id, "RESTORE", user.id!);
    revalidatePath("/dashboard/assets");
    revalidatePath("/dashboard/assets/trash");
    return { success: true };
  } catch (e) {
    console.error("restoreAsset error:", e);
    return { success: false, error: "Gagal memulihkan aset" };
  }
}

export async function uploadAssetPhotos(
  assetId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const files = formData.getAll("photos") as File[];
    if (files.length === 0) return { success: true };

    const existingCount = await prisma.assetPhoto.count({
      where: { assetId },
    });

    if (existingCount + files.length > 5) {
      return { success: false, error: "Maksimal 5 foto per aset" };
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: `File ${file.name} melebihi 5MB` };
      }

      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        return { success: false, error: `Tipe file ${file.name} tidak didukung` };
      }

      const buffer = await file.arrayBuffer();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileUrl = await uploadFile(buffer, sanitizedName, file.type);

      await prisma.assetPhoto.create({
        data: {
          assetId,
          filePath: fileUrl,
          fileName: file.name,
          fileSize: file.size,
          isPrimary: existingCount === 0,
        },
      });
    }

    revalidatePath(`/dashboard/assets/${assetId}`);
    return { success: true };
  } catch (e) {
    console.error("uploadAssetPhotos error:", e);
    return { success: false, error: "Gagal mengunggah foto" };
  }
}

export async function deleteAssetPhoto(photoId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const photo = await prisma.assetPhoto.findUniqueOrThrow({
      where: { id: photoId },
    });

    await deleteFile(photo.filePath);
    await prisma.assetPhoto.delete({ where: { id: photoId } });

    revalidatePath(`/dashboard/assets/${photo.assetId}`);
    return { success: true };
  } catch (e) {
    console.error("deleteAssetPhoto error:", e);
    return { success: false, error: "Gagal menghapus foto" };
  }
}

export async function getAssets(params: {
  search?: string;
  categoryId?: string;
  conditionId?: string;
  fundSourceId?: string;
  locationId?: string;
  year?: string;
  showDeleted?: boolean;
}) {
  await requireAuth();

  const where: Record<string, unknown> = {
    deletedAt: params.showDeleted ? { not: null } : null,
  };

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { assetCode: { contains: params.search, mode: "insensitive" } },
      { serialNumber: { contains: params.search, mode: "insensitive" } },
      { userName: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.conditionId) where.conditionId = params.conditionId;
  if (params.fundSourceId) where.fundSourceId = params.fundSourceId;
  if (params.locationId) where.locationId = params.locationId;
  if (params.year) where.yearPurchased = parseInt(params.year, 10);

  return prisma.asset.findMany({
    where,
    include: {
      category: { select: { name: true, codePrefix: true } },
      condition: { select: { name: true, severityLevel: true } },
      fundSource: { select: { name: true } },
      location: { select: { name: true, building: true, floor: true } },
      photos: { select: { id: true, filePath: true, isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAssetById(id: string) {
  await requireAuth();

  return prisma.asset.findUnique({
    where: { id },
    include: {
      category: true,
      condition: true,
      fundSource: true,
      location: true,
      creator: { select: { name: true } },
      photos: { orderBy: { isPrimary: "desc" } },
      mutations: {
        orderBy: { mutationDate: "desc" },
        include: { creator: { select: { name: true } } },
      },
    },
  });
}

export async function getMasterDataForForm() {
  await requireAuth();

  const [categories, conditions, fundSources, locations] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.condition.findMany({ orderBy: { severityLevel: "asc" } }),
    prisma.fundSource.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { categories, conditions, fundSources, locations };
}
