import { z } from "zod/v4";

export const GitHubReleaseAsset = z.object({
	id: z.int(),
	name: z.string(),
	digest: z.string().nullable(),
	created_at: z.coerce.date(),
	updated_at: z.coerce.date(),
	browser_download_url: z.string(),
	content_type: z.string(),
	size: z.int(),
});

export type GitHubReleaseAsset = z.output<typeof GitHubReleaseAsset>;


export const GitHubRelease = z.object({
	tag_name: z.string(),
	published_at: z.coerce.date(),
	prerelease: z.boolean(),
	html_url: z.string(),
	draft: z.boolean(),
	assets: z.array(GitHubReleaseAsset)
});

export type GitHubRelease = z.output<typeof GitHubRelease>;


export const GitHubReleases = z.array(GitHubRelease);

export type GitHubReleases = z.output<typeof GitHubReleases>;