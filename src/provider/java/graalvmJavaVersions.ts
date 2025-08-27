import { GRAALVM_API } from "#common/constants/urls.ts";
import { defineProvider } from "#core/provider.ts";
import { GitHubReleaseAsset, GitHubReleases } from "#schema/githubReleaseRef.ts";

export default defineProvider({
	id: "graalvm-java",

	async provide(http): Promise<GitHubReleases> {
		const versionsOptions = new URLSearchParams({
			per_page: "100",
		});

		const versions = GitHubReleases.parse(
			(await http.getCached(new URL("releases?" + versionsOptions, GRAALVM_API), "java-runtime-versions.json")).json()
		);

		let index = 0;
		while (index < versions.length) {
			const version = versions[index]!!;
			version.assets = version.assets.filter(x => isAvailableAsset(x, version.assets));

			version.assets = await Promise.all(version.assets.map(async x => {
				x.digest = "sha256:" + (await http.getCached(new URL(x.browser_download_url + ".sha256"), `file-sha256-${x.id}.json`)).body;
				return x;
			}))

			versions[index++] = version;
		}

		return versions;
	},
})


function isAvailableAsset(entry: GitHubReleaseAsset, array: GitHubReleaseAsset[]): boolean {
	if (entry.created_at.getFullYear() < 2023) {
		return false;
	}

	if (!entry.digest && !entry.name.endsWith(".sha256") && !array.find(x => `${entry.name}.sha256` == x.name)) {
		return false
	}

	if (!entry.name.startsWith("graalvm-community-jdk-")) {
		return false;
	}

	if (!entry.name.endsWith("_bin.tar.gz") && !entry.name.endsWith(".zip")) {
		return false;
	}

	if (!entry.name.includes("linux") && !entry.name.includes("windows") && !entry.name.includes("macos")) {
		return false;
	}

	if (!entry.name.includes("aarch64") && !entry.name.includes("x64")) {
		return false;
	}

	return true;
}