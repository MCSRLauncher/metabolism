import { z } from "zod/v4";

export const GraalVMJavaAsset = z.object({
	id: z.int(),
	name: z.string(),
	digest: z.string().nullable(),
	created_at: z.coerce.date(),
	browser_download_url: z.string()
});

export type GraalVMJavaAsset = z.output<typeof GraalVMJavaAsset>;


export const GraalVMJavaVersion = z.object({
	tag_name: z.string(),
	published_at: z.coerce.date(),
	prerelease: z.boolean(),
	draft: z.boolean(),
	assets: z.array(GraalVMJavaAsset)
});

export type GraalVMJavaVersion = z.output<typeof GraalVMJavaVersion>;


export const GraalVMJavaVersions = z.array(GraalVMJavaVersion);

export type GraalVMJavaVersions = z.output<typeof GraalVMJavaVersions>;