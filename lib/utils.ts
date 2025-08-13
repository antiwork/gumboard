import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl(requestOrHeaders?: Request | Headers): string {
  if (requestOrHeaders && "url" in requestOrHeaders) {
    const url = new URL(requestOrHeaders.url);
    return `${url.protocol}//${url.host}`;
  }

  if (requestOrHeaders && "get" in requestOrHeaders) {
    const host = requestOrHeaders.get("host");
    const protocol = requestOrHeaders.get("x-forwarded-proto") || "http";
    return `${protocol}://${host}`;
  }

  return process.env.AUTH_URL || "http://localhost:3000";
}
