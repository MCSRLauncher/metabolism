import { defineGoal, type VersionOutput } from "#core/goal.ts";
import { defineProvider } from "#core/provider.ts";
import { GitHubRelease } from "#schema/githubReleaseRef.ts";
import { SpeedrunMapIndex } from "#schema/speedrun/mapsIndex.ts";
import rawMaps from "../../../packs/practiceMaps.json" with { type: "json" }

interface PracticeMapInfo {
	type: string,
	target: string,
	regex?: string,
	targetVersion?: string,
	name: string,
	authors: string[],
	description: string,
	versions: string[]
}

const maps: PracticeMapInfo[] = rawMaps as PracticeMapInfo[];

const providor = defineProvider({
	id: "practice-maps",
	async provide(http) {
		return Promise.all(maps.map(async map => {
			if (map.type == "github") {
				const assets = GitHubRelease.parse(
					(await http.getCached(new URL(`https://api.github.com/repos/${map.target}/releases/${map.targetVersion ? `tags/${map.targetVersion}` : "latest"}`), `practicemap-${map.type}-${map.target.replace("/", "_")}.json`)).json()
				).assets;

				const targetZip = assets.find(a => a.content_type == "application/x-zip-compressed" && (!map.regex || new RegExp(map.regex).test(a.name)));
				if (!targetZip) return null;

				return {
					map: map,
					source: `https://github.com/${map.target}`,
					res: targetZip
				};
			} else {
				throw "Illegal map type argument";
			}
		}));
	}
});

export default defineGoal({
	id: "org.mcsr.maps.practice",
	name: "Practice Maps",
	provider: providor,
	generate(info): VersionOutput[] {
		const result: SpeedrunMapIndex[] = [];

		for (const mapInfo of info) {
			if (!mapInfo) continue;
			result.push({
				name: mapInfo.map.name,
				description: mapInfo.map.description,
				authors: mapInfo.map.authors,
				downloadUrl: mapInfo.res.browser_download_url,
				sources: mapInfo.source,
				versions: mapInfo.map.versions,
			})
		}

		return [{
			version: "verified",
			releaseTime: new Date().toISOString(),
			maps: result
		}];
	},
	recommend: () => false
});