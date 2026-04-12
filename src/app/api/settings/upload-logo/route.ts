import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("logo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: "Format file tidak didukung" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const sanitizedName = `logo-${Date.now()}.${file.name.split(".").pop()}`;
    const url = await uploadFile(buffer, sanitizedName, file.type, "logos");

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "Gagal mengupload logo" }, { status: 500 });
  }
}
