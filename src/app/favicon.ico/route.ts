import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Serve the AL-LIO app mark (mark on a black rounded square) as the browser
// tab icon. Evaluated once at build time and cached as a static asset.
export const dynamic = "force-static";

export async function GET() {
  const icon = await readFile(join(process.cwd(), "public", "assets", "al_lio_icon_black.png"));
  return new Response(new Uint8Array(icon), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
