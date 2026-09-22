import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABEL, type Platform } from "@/lib/files";

type AppCardProps = {
  name: string;
  slug: string;
  shortDescription: string;
  iconUrl: string | null;
  platforms: Platform[];
};

export function AppCard({ name, slug, shortDescription, iconUrl, platforms }: AppCardProps) {
  return (
    <Link
      href={`/apps/${slug}`}
      className="flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-colors duration-200 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-4">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl border border-border object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{name}</h2>
          <p className="line-clamp-2 text-sm text-muted-foreground">{shortDescription}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {platforms.length === 0 ? (
          <Badge>릴리즈 준비 중</Badge>
        ) : (
          platforms.map((platform) => <Badge key={platform}>{PLATFORM_LABEL[platform]}</Badge>)
        )}
      </div>
    </Link>
  );
}
