import { defineGoal, type VersionOutput } from "#core/goal.ts";
import { defineProvider } from "#core/provider.ts";
import { GitHubReleases } from "#schema/githubReleaseRef.ts";
import type { SpeedrunToolsIndexes, SpeedrunToolsPack } from "#schema/speedrun/toolsIndex.ts";
import rawList from "../../../packs/tools.json" with { type: "json" };

const tools: SpeedrunToolsPack[] = rawList as SpeedrunToolsPack[];

const providor = defineProvider({
    id: "speedrun-tools",
    async provide(http) {
        return Promise.all(tools.map(async tool => {
            if (tool.type == "github") {
                const release = GitHubReleases.parse(
                    (await http.getCached(new URL(`https://api.github.com/repos/${tool.target}/releases`), `speedruntools-${tool.type}-${tool.target.replace("/", "_")}.json`)).json()
                );

                return {
                    tool: tool,
                    versions: release.filter(res => res.assets.filter(asset => asset.name.endsWith(tool.format)).length > 0).map(res => {
                        const targetFile = res.assets.find(asset => asset.name.endsWith(tool.format))!!;
                        return {
                            checksum: { type: targetFile.digest!!.split(":")[0]!!, hash: targetFile.digest!!.split(":")[1]!! },
                            name: targetFile.name,
                            version: res.tag_name,
                            releaseTime: res.published_at,
                            url: targetFile.browser_download_url,
                        }
                    }),
                };
            } else {
                throw "Illegal map type argument";
            }
        }));
    }
});

export default defineGoal({
    id: "org.mcsr.tools",
    name: "Speedrun Tools",
    provider: providor,
    generate(info): VersionOutput[] {
        const result: SpeedrunToolsIndexes[] = [];

        for (const toolInfo of info) {
            if (!toolInfo) continue;
            result.push({
                ...toolInfo.tool,
                versions: toolInfo.versions
            });
        }

        let releaseTime: Date | null = null;
        for (const tool of result) {
            for (const version of tool.versions) {
                if (!releaseTime || +releaseTime < version.releaseTime.getTime()) {
                    releaseTime = version.releaseTime;
                }
            }
        }
        if (!releaseTime) releaseTime = new Date();

        return result.map(r => ({
            version: r.id,
            releaseTime: releaseTime.toISOString(),
            tool: r
        }));
    },
    recommend: () => false
});