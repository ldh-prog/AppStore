export const PLATFORMS = ["android", "windows", "macos", "linux"] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

const PLATFORM_EXTENSIONS: Record<Platform, readonly string[]> = {
  android: [".apk"],
  windows: [".exe"],
  macos: [".dmg"],
  linux: [".appimage", ".deb"],
};

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const INSTALLER_MAX_BYTES = 2 * 1024 * 1024 * 1024;

const INSTALLER_CONTENT_TYPES: Record<string, string> = {
  ".apk": "application/vnd.android.package-archive",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".dmg": "application/x-apple-diskimage",
  ".deb": "application/vnd.debian.binary-package",
  ".appimage": "application/octet-stream",
};

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function fileExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const index = base.lastIndexOf(".");
  if (index <= 0) return "";
  return base.slice(index).toLowerCase();
}

/**
 * 객체 키와 Content-Disposition에 넣을 파일명.
 * 경로 구분자를 제거하고, 서명에 섞이기 쉬운 문자를 빼 둔다.
 */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "file";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "");
  const sliced = cleaned.slice(0, 120);
  return sliced.length > 0 ? sliced : "file";
}

export function installerContentType(platform: Platform, fileName: string): string | null {
  const extension = fileExtension(fileName);
  if (!PLATFORM_EXTENSIONS[platform].includes(extension)) return null;
  return INSTALLER_CONTENT_TYPES[extension] ?? null;
}

export function imageContentType(fileName: string): string | null {
  return IMAGE_CONTENT_TYPES[fileExtension(fileName)] ?? null;
}

export function acceptForPlatform(platform: Platform): string {
  return PLATFORM_EXTENSIONS[platform].join(",");
}

export function platformExtensionLabel(platform: Platform): string {
  return PLATFORM_EXTENSIONS[platform].join(", ");
}
