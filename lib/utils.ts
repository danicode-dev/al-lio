import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function asString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
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

export function greeting(name = "Dani") {
  const hour = new Date().getHours();
  if (hour < 14) return `Buenos dias, ${name}`;
  if (hour < 21) return `Buenas tardes, ${name}`;
  return `Buenas noches, ${name}`;
}
