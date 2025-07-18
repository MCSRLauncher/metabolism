import { defineGoal, type VersionOutput } from "#core/goal.ts";
import speedrunModVersions from "#provider/speedrunModVersions.ts";
import type { SpeedrunModIndexes } from "#schema/speedrun/modsIndex.ts";

export default defineGoal({
    id: "org.mcsr.mods",
    name: "Speedrun Mods",
    provider: speedrunModVersions,

    generate(info): VersionOutput[] {
        const date = new Date();
        return [{
            version: `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}.${date.getUTCDate()}+verified`,
            releaseTime: date.toISOString(),
            mods: info.mods
        }];
    },
    recommend: () => false,
})