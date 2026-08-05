"use client";

import { useEffect, useRef, useState } from "react";
import { parseYouTubeUrl } from "@/lib/utils";

type YouTubePlayerInstance = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: () => void };
        }
      ) => YouTubePlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });

  return youTubeApiPromise;
}

export function useYouTubePlayer(videoUrl: string | null | undefined) {
  const youtubeRef = videoUrl ? parseYouTubeUrl(videoUrl) : null;
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setPlayerReady(false);
    setCurrentTime(0);
    if (!youtubeRef || !playerContainerRef.current) return;
    let cancelled = false;

    const playerVars: Record<string, number | string> =
      youtubeRef.type === "playlist" ? { rel: 0, listType: "playlist", list: youtubeRef.id } : { rel: 0 };

    loadYouTubeApi().then(() => {
      if (cancelled || !playerContainerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        ...(youtubeRef.type === "video" ? { videoId: youtubeRef.id } : {}),
        playerVars,
        events: { onReady: () => setPlayerReady(true) },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeRef?.type, youtubeRef?.id]);

  useEffect(() => {
    if (!playerReady) return;
    const interval = setInterval(() => {
      const time = playerRef.current?.getCurrentTime();
      if (typeof time === "number") setCurrentTime(time);
    }, 1000);
    return () => clearInterval(interval);
  }, [playerReady]);

  function seekTo(seconds: number) {
    playerRef.current?.seekTo(seconds, true);
  }

  return { youtubeRef, playerContainerRef, playerReady, currentTime, seekTo };
}

export function formatTimestamp(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
