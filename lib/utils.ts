import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function asString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export function greeting(name = "Dani") {
  const hour = new Date().getHours();
  if (hour < 14) return `Buenos dias, ${name}`;
  if (hour < 21) return `Buenas tardes, ${name}`;
  return `Buenas noches, ${name}`;
}
