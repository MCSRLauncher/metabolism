import { defineGoal, type VersionOutput } from "#core/goal.ts";
import speedrunModVersions from "#provider/speedrunModVersions.ts";
import type { SpeedrunModIndexes } from "#schema/speedrun/modsIndex.ts";

export default defineGoal({
    id: "org.mcsr.mods",
    name: "Speedrun Mods",
    provider: speedrunModVersions,

    generate(info): VersionOutput[] {
		const result: VersionOutput[] = [];
        for (const mod of info.mods) {
            result.push()
        }
        return [{
            version: "verified",
            releaseTime: new Date().toISOString(),
            mods: info.mods
        }];
    },
    recommend: (_, output) => false,
})