import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type YouTubeReference = { type: "video"; id: string } | { type: "playlist"; id: string };

export function parseYouTubeUrl(url: string): YouTubeReference | null {
  try {
    const parsed = new URL(url);
    const isYouTubeHost = parsed.hostname === "youtu.be" || parsed.hostname.endsWith("youtube.com");
    if (!isYouTubeHost) return null;

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? { type: "video", id } : null;
    }

    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id ? { type: "video", id } : null;
    }

    if (parsed.pathname.startsWith("/embed/")) {
      const id = parsed.pathname.split("/")[2];
      return id ? { type: "video", id } : null;
    }

    if (parsed.pathname === "/playlist") {
      const id = parsed.searchParams.get("list");
      return id ? { type: "playlist", id } : null;
    }

    return null;
  } catch {
    return null;
  }
}
