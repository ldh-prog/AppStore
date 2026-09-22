import { SiteHeader } from "@/components/store/site-header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
      >
        본문으로 건너뛰기
      </a>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24">
        {children}
      </main>
    </>
  );
}
