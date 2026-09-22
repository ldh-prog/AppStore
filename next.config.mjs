/** @type {import('next').NextConfig} */

/**
 * 스크린샷 호스트는 빌드 시점의 공개 URL로 고정한다.
 * 런타임에 아무 호스트나 허용하면 next/image가 개방 프록시처럼 동작한다.
 */
function r2ImageHostname() {
  const raw = process.env.R2_PUBLIC_BASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.hostname;
  } catch {
    return null;
  }
}

const r2Hostname = r2ImageHostname();

const nextConfig = {
  images: {
    remotePatterns: r2Hostname
      ? [{ protocol: "https", hostname: r2Hostname, pathname: "/**" }]
      : [],
  },
  experimental: {
    // 설치 파일은 Server Action 본문으로 받지 않는다. Vercel 한도는 4.5MB다.
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
