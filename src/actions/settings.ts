"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Fixed singleton ID — ensures there is always exactly one settings row.
const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_SETTINGS = {
  appName: "InvenTrack",
  institutionName: "Instansi",
  appDescription:
    "Sistem manajemen inventaris & pelabelan aset berbasis QR Code yang terintegrasi dan mudah digunakan.",
};

export async function getAppSettings() {
  let settings = await prisma.appSetting.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) {
    try {
      settings = await prisma.appSetting.create({
        data: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
      });
    } catch (error: unknown) {
      // Menangani race condition (P2002: Unique constraint failed)
      // Jika request paralel menyebabkan create yang bersamaan
      const isUniqueConstraint = 
        typeof error === "object" && 
        error !== null && 
        "code" in error && 
        (error as { code?: string }).code === "P2002";

      if (isUniqueConstraint) {
        settings = await prisma.appSetting.findUnique({
          where: { id: SETTINGS_ID },
        });
      } else {
        throw error;
      }
    }
  }

  return settings;
}

export async function updateAppSettings(
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const appName = formData.get("appName") as string;
    const institutionName = formData.get("institutionName") as string;
    const appDescription = formData.get("appDescription") as string;
    const logoUrl = formData.get("logoUrl") as string | null;

    if (!appName || !institutionName) {
      return { success: false, error: "Nama aplikasi dan nama instansi wajib diisi." };
    }

    await prisma.appSetting.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        appName,
        institutionName,
        appDescription: appDescription || null,
        logoUrl: logoUrl || null,
      },
      update: {
        appName,
        institutionName,
        appDescription: appDescription || null,
        ...(logoUrl !== null && { logoUrl }),
      },
    });

    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan.",
    };
  }
}

export async function updateAppLogo(logoUrl: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.appSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, logoUrl },
      update: { logoUrl },
    });

    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengupload logo.",
    };
  }
}

export async function removeAppLogo(): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.appSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, logoUrl: null },
      update: { logoUrl: null },
    });

    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghapus logo.",
    };
  }
}
