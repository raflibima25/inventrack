import { NextResponse } from "next/server";
import { getAppSettings } from "@/actions/settings";

// Force dynamic so favicon always reflects current settings
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getAppSettings();

    if (settings.logoUrl) {
      // Proxy the image from MinIO — avoids CORS & browser favicon restrictions
      const imageRes = await fetch(settings.logoUrl, {
        next: { revalidate: 3600 }, // re-fetch from MinIO at most once per hour
      });

      if (imageRes.ok) {
        const buffer = await imageRes.arrayBuffer();
        const contentType =
          imageRes.headers.get("content-type") || "image/png";

        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            // Let browser cache for 1 hour; on logo change revalidatePath clears server cache
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      }
    }
  } catch {
    // Fall through to default
  }

  // Fallback: serve the static logo-icon.svg from public/
  return NextResponse.redirect(
    new URL("/images/logo/logo-icon.svg", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
  );
}
