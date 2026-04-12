"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getAppSettings() {
  let settings = await prisma.appSetting.findFirst();

  if (!settings) {
    settings = await prisma.appSetting.create({
      data: {
        appName: "InvenTrack",
        institutionName: "Instansi",
        appDescription:
          "Sistem manajemen inventaris & pelabelan aset berbasis QR Code yang terintegrasi dan mudah digunakan.",
      },
    });
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

    const settings = await prisma.appSetting.findFirst();

    if (settings) {
      await prisma.appSetting.update({
        where: { id: settings.id },
        data: {
          appName,
          institutionName,
          appDescription: appDescription || null,
          ...(logoUrl !== null && { logoUrl }),
        },
      });
    } else {
      await prisma.appSetting.create({
        data: {
          appName,
          institutionName,
          appDescription: appDescription || null,
          logoUrl: logoUrl || null,
        },
      });
    }

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

    const settings = await prisma.appSetting.findFirst();
    if (!settings) {
      return { success: false, error: "Pengaturan belum diinisialisasi." };
    }

    await prisma.appSetting.update({
      where: { id: settings.id },
      data: { logoUrl },
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

    const settings = await prisma.appSetting.findFirst();
    if (!settings) {
      return { success: false, error: "Pengaturan belum diinisialisasi." };
    }

    await prisma.appSetting.update({
      where: { id: settings.id },
      data: { logoUrl: null },
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
