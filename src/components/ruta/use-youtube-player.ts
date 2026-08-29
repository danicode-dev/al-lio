"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseYouTubeUrl } from "@/lib/utils";

type YouTubePlayerInstance = {
  getCurrentTime: () => number;
  getDuration: () => number;
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
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: () => void;
          };
        }
      ) => YouTubePlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApiPromise: Promise<void> | null = null;
const YOUTUBE_API_TIMEOUT_MS = 15_000;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve, reject) => {
    let settled = false;
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      youTubeApiPromise = null;
      reject(new Error("youtube_api_timeout"));
    }, YOUTUBE_API_TIMEOUT_MS);

    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const existingScript = document.getElementById("youtube-iframe-api") as HTMLScriptElement | null;
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        script.remove();
        youTubeApiPromise = null;
        reject(new Error("youtube_api_load_failed"));
      };
      document.head.appendChild(script);
    }
  });

  return youTubeApiPromise;
}

// The YouTube IFrame API replaces whatever element it's given with its own
// <iframe>, outside of React's control. If that element is one React also
// renders/diffs (even just to toggle a class or style), React and the API
// end up fighting over the same DOM node and React throws trying to remove
// a node that's no longer where it expects. To avoid that, `wrapperRef` is
// the only thing React ever renders — it's an empty, static leaf. Everything
// the API touches (the mount div, the iframe it creates) is created and torn
// down imperatively inside the effect, so React never has children to diff there.
export function useYouTubePlayer(videoUrl: string | null | undefined, initialTimeSeconds = 0) {
  const youtubeRef = useMemo(() => (videoUrl ? parseYouTubeUrl(videoUrl) : null), [videoUrl]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  // The initial jump (a "Ir al momento" link, or resuming where the student
  // left off) has to land exactly once. YouTube frequently ignores a
  // seekTo() issued from onReady because the video module has not finished
  // loading yet, so the seek is retried on the first real playback state
  // change and this ref keeps that retry idempotent.
  const initialSeekAppliedRef = useRef(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerState, setPlayerState] = useState(-1);

  useEffect(() => {
    setPlayerReady(false);
    setPlayerError(null);
    setCurrentTime(0);
    setDuration(0);
    setPlayerState(-1);
    initialSeekAppliedRef.current = false;
    const wrapper = wrapperRef.current;
    if (!youtubeRef || !wrapper) return;
    let cancelled = false;

    // Any positive start position is honoured; a note taken at second 0-1 or
    // a "resume" that never really started just plays from the top.
    const applyInitialSeek = () => {
      if (initialSeekAppliedRef.current || initialTimeSeconds <= 0) return;
      const player = playerRef.current;
      if (!player) return;
      initialSeekAppliedRef.current = true;
      player.seekTo(initialTimeSeconds, true);
      setCurrentTime(initialTimeSeconds);
    };

    const mountNode = document.createElement("div");
    mountNode.style.position = "absolute";
    mountNode.style.inset = "0";
    mountNode.style.width = "100%";
    mountNode.style.height = "100%";
    wrapper.appendChild(mountNode);

    const playerVars: Record<string, number | string> =
      youtubeRef.type === "playlist" ? { rel: 0, listType: "playlist", list: youtubeRef.id } : { rel: 0 };

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !window.YT) return;
        try {
          playerRef.current = new window.YT.Player(mountNode, {
            ...(youtubeRef.type === "video" ? { videoId: youtubeRef.id } : {}),
            playerVars,
            events: {
              onReady: () => {
                const player = playerRef.current;
                setDuration(player?.getDuration() ?? 0);
                applyInitialSeek();
                setPlayerReady(true);
              },
              onStateChange: (event) => {
                setPlayerState(event.data);
                // 1 playing, 3 buffering, 5 video cued - the first time the
                // player reports any of these it can accept the seek that
                // onReady may have been too early to apply.
                if (event.data === 1 || event.data === 3 || event.data === 5) applyInitialSeek();
              },
              onError: () => setPlayerError("No se pudo reproducir este vídeo."),
            },
          });
        } catch {
          setPlayerError("No se pudo iniciar el reproductor.");
        }
      })
      .catch(() => {
        if (!cancelled) setPlayerError("YouTube no ha respondido. Comprueba tu conexión e inténtalo de nuevo.");
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      // Whatever is left in `wrapper` (the mountNode, or the iframe the API
      // swapped it for) was never rendered by React, so clearing it manually
      // here is safe and keeps the wrapper empty for the next run.
      wrapper.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeRef?.type, youtubeRef?.id, retryKey]);

  useEffect(() => {
    if (!playerReady) return;
    const interval = setInterval(() => {
      const time = playerRef.current?.getCurrentTime();
      if (typeof time === "number") setCurrentTime(time);
      const playerDuration = playerRef.current?.getDuration();
      if (typeof playerDuration === "number" && playerDuration > 0) setDuration(playerDuration);
    }, 1000);
    return () => clearInterval(interval);
  }, [playerReady]);

  function seekTo(seconds: number) {
    playerRef.current?.seekTo(seconds, true);
  }

  function retryPlayer() {
    setRetryKey((current) => current + 1);
  }

  return {
    youtubeRef,
    playerContainerRef: wrapperRef,
    playerReady,
    playerError,
    currentTime,
    duration,
    playerState,
    seekTo,
    retryPlayer,
  };
}
