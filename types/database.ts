export type Platform = "android" | "windows" | "macos" | "linux";

export type AppRow = {
  id: string;
  name: string;
  slug: string;
  package_name: string;
  short_description: string;
  description: string;
  icon_url: string | null;
  icon_object_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ReleaseRow = {
  id: string;
  app_id: string;
  version_string: string;
  version_code: number;
  platform: Platform;
  download_url: string;
  r2_object_key: string;
  file_name: string;
  file_size_bytes: number | null;
  release_notes: string;
  is_mandatory: boolean;
  created_at: string;
};

export type ScreenshotRow = {
  id: string;
  app_id: string;
  image_url: string;
  r2_object_key: string | null;
  alt_text: string;
  sort_order: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      apps: {
        Row: AppRow;
        Insert: {
          name: string;
          slug: string;
          package_name: string;
          short_description: string;
          description?: string;
          icon_url?: string | null;
          icon_object_key?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          package_name?: string;
          short_description?: string;
          description?: string;
          icon_url?: string | null;
          icon_object_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "releases_app_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "releases";
            referencedColumns: ["app_id"];
          },
          {
            foreignKeyName: "screenshots_app_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "screenshots";
            referencedColumns: ["app_id"];
          },
        ];
      };
      releases: {
        Row: ReleaseRow;
        Insert: {
          app_id: string;
          version_string: string;
          version_code: number;
          platform: Platform;
          download_url: string;
          r2_object_key: string;
          file_name: string;
          file_size_bytes?: number | null;
          release_notes?: string;
          is_mandatory?: boolean;
        };
        Update: {
          release_notes?: string;
          is_mandatory?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "releases_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "apps";
            referencedColumns: ["id"];
          },
        ];
      };
      screenshots: {
        Row: ScreenshotRow;
        Insert: {
          app_id: string;
          image_url: string;
          r2_object_key?: string | null;
          alt_text?: string;
          sort_order?: number;
        };
        Update: {
          alt_text?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "screenshots_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "apps";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
