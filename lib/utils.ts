import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveImageUrl(path: string | undefined | null) {
  if (!path) return "";
  // If it's already a full URL, return as-is
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) return path;
  // For Convex storage IDs, we need to use the storage URL API
  // This will be resolved on the client side via the getImageUrl query
  return path;
}
