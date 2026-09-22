import { z } from "zod";
import { PLATFORMS } from "@/lib/files";

export const VERSION_STRING_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PACKAGE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;

export const platformSchema = z.enum(PLATFORMS);

export const appMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요.")
    .max(80, "이름은 80자 이하로 입력해 주세요."),
  slug: z
    .string()
    .trim()
    .regex(SLUG_PATTERN, "주소는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다."),
  package_name: z
    .string()
    .trim()
    .min(3, "패키지 이름은 3자 이상이어야 합니다.")
    .max(200, "패키지 이름은 200자 이하로 입력해 주세요.")
    .regex(PACKAGE_NAME_PATTERN, "패키지 이름은 kr.ulsan.ldh.myapp 형식으로 입력해 주세요."),
  short_description: z
    .string()
    .trim()
    .min(1, "짧은 설명을 입력해 주세요.")
    .max(160, "짧은 설명은 160자 이하로 입력해 주세요."),
  description: z.string().trim().max(8000, "설명은 8000자 이하로 입력해 주세요."),
});

export const releaseMetadataSchema = z.object({
  appId: z.string().uuid("앱 식별자가 올바르지 않습니다."),
  platform: platformSchema,
  version_string: z
    .string()
    .trim()
    .regex(VERSION_STRING_PATTERN, "버전은 1.2.0 또는 1.2.0-beta.1 형식이어야 합니다."),
  version_code: z
    .number({ invalid_type_error: "버전 코드는 정수입니다." })
    .int("버전 코드는 정수입니다.")
    .positive("버전 코드는 1 이상이어야 합니다."),
  release_notes: z.string().trim().max(8000, "릴리즈 노트는 8000자 이하로 입력해 주세요."),
  is_mandatory: z.boolean(),
  fileName: z.string().trim().min(1, "설치 파일을 선택해 주세요.").max(200),
  fileSize: z.number().int().positive("파일 크기가 올바르지 않습니다."),
});

export const assetUploadSchema = z.object({
  appId: z.string().uuid(),
  kind: z.enum(["icon", "screenshot"]),
  fileName: z.string().trim().min(1).max(200),
  fileSize: z.number().int().positive(),
});

export const attachAssetSchema = z.object({
  appId: z.string().uuid(),
  objectKey: z.string().min(1).max(500),
  fileSize: z.number().int().positive(),
  altText: z.string().trim().max(120).optional(),
});

export const updateCheckQuerySchema = z
  .object({
    app_id: z.string().uuid("app_id는 UUID여야 합니다.").optional(),
    package_name: z
      .string()
      .trim()
      .regex(PACKAGE_NAME_PATTERN, "package_name 형식이 올바르지 않습니다.")
      .optional(),
    current_version: z
      .string()
      .trim()
      .regex(VERSION_STRING_PATTERN, "current_version은 1.2.0 형식이어야 합니다."),
    platform: platformSchema,
  })
  .refine((value) => value.app_id || value.package_name, {
    message: "app_id 또는 package_name이 필요합니다.",
  });

export const signInSchema = z.object({
  email: z.string().trim().email("이메일 형식을 확인해 주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  next: z.string().optional(),
});

export type AppMetadata = z.infer<typeof appMetadataSchema>;
export type ReleaseMetadata = z.infer<typeof releaseMetadataSchema>;
export type UpdateCheckQuery = z.infer<typeof updateCheckQuerySchema>;
