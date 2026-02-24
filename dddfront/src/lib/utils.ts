import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Modifiez API_URL pour qu'elle pointe vers la racine de votre backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';