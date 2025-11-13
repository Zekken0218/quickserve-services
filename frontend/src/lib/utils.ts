import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPeso(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 0;
  if (!isFinite(num)) return "₱0.00";
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${isNeg ? "-" : ""}₱${withSpaces}.${decPart}`;
}

export function formatTime12h(time: string | null | undefined): string {
  if (!time) return "";
  // Expect HH:MM (optionally with seconds); fallback to original if pattern mismatch
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return time;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const am = hours < 12;
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return `${hours}:${minutes} ${am ? "AM" : "PM"}`;
}
