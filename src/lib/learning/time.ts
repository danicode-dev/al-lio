export function formatTimestamp(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = Math.floor(safe % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
