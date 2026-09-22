import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Platform } from "@/lib/files";
import { isPlatform } from "@/lib/files";
import type { AppRow, ReleaseRow, ScreenshotRow } from "@/types/database";

export type QueryResult<T> =
  | { status: "unconfigured" }
  | { status: "error"; reason: "schema" | "unavailable" }
  | { status: "ok"; data: T };

export type CatalogApp = {
  id: string;
  name: string;
  slug: string;
  package_name: string;
  short_description: string;
  icon_url: string | null;
  platforms: Platform[];
};

export type AppDetail = AppRow & {
  screenshots: ScreenshotRow[];
  releases: ReleaseRow[];
};

export async function listCatalogApps(): Promise<QueryResult<CatalogApp[]>> {
  const supabase = createClient();
  if (!supabase) return { status: "unconfigured" };

  const { data, error } = await supabase
    .from("apps")
    .select("id, name, slug, package_name, short_description, icon_url, releases(platform)")
    .order("name", { ascending: true });

  if (error) {
    console.error("listCatalogApps", error.message);
    return { status: "error", reason: schemaReason(error.message, error.code) };
  }

  const apps = (data ?? []).map((row) => {
    const releases = Array.isArray(row.releases) ? row.releases : [];
    const platforms = uniquePlatforms(releases.map((release) => release.platform));
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      package_name: row.package_name,
      short_description: row.short_description,
      icon_url: row.icon_url,
      platforms,
    };
  });

  return { status: "ok", data: apps };
}

export async function getAppDetailBySlug(slug: string): Promise<QueryResult<AppDetail | null>> {
  const supabase = createClient();
  if (!supabase) return { status: "unconfigured" };

  const { data, error } = await supabase
    .from("apps")
    .select("*, screenshots(*), releases(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getAppDetailBySlug", error.message);
    return { status: "error", reason: schemaReason(error.message, error.code) };
  }

  if (!data) return { status: "ok", data: null };

  const screenshots = asArray<ScreenshotRow>(data.screenshots).sort(
    (left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at),
  );
  const releases = asArray<ReleaseRow>(data.releases).sort(
    (left, right) => right.version_code - left.version_code,
  );

  return {
    status: "ok",
    data: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      package_name: data.package_name,
      short_description: data.short_description,
      description: data.description,
      icon_url: data.icon_url,
      icon_object_key: data.icon_object_key,
      created_at: data.created_at,
      updated_at: data.updated_at,
      screenshots,
      releases,
    },
  };
}

export async function listAdminApps(): Promise<
  QueryResult<
    {
      id: string;
      name: string;
      slug: string;
      package_name: string;
      releases: Pick<ReleaseRow, "platform" | "version_string" | "version_code">[];
    }[]
  >
> {
  const supabase = createClient();
  if (!supabase) return { status: "unconfigured" };

  const { data, error } = await supabase
    .from("apps")
    .select("id, name, slug, package_name, releases(platform, version_string, version_code)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listAdminApps", error.message);
    return { status: "error", reason: schemaReason(error.message, error.code) };
  }

  return {
    status: "ok",
    data: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      package_name: row.package_name,
      releases: asArray(row.releases),
    })),
  };
}

export async function getAdminApp(id: string): Promise<QueryResult<AppDetail | null>> {
  const supabase = createClient();
  if (!supabase) return { status: "unconfigured" };

  const { data, error } = await supabase
    .from("apps")
    .select("*, screenshots(*), releases(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getAdminApp", error.message);
    return { status: "error", reason: schemaReason(error.message, error.code) };
  }
  if (!data) return { status: "ok", data: null };

  return {
    status: "ok",
    data: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      package_name: data.package_name,
      short_description: data.short_description,
      description: data.description,
      icon_url: data.icon_url,
      icon_object_key: data.icon_object_key,
      created_at: data.created_at,
      updated_at: data.updated_at,
      screenshots: asArray<ScreenshotRow>(data.screenshots),
      releases: asArray<ReleaseRow>(data.releases),
    },
  };
}

function uniquePlatforms(values: string[]): Platform[] {
  const found = new Set<Platform>();
  values.forEach((value) => {
    if (isPlatform(value)) found.add(value);
  });
  return [...found];
}

function asArray<T>(value: T[] | T | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function schemaReason(message: string, code?: string): "schema" | "unavailable" {
  if (code === "PGRST205" || code === "42P01" || message.includes("schema cache")) {
    return "schema";
  }
  return "unavailable";
}
