import { defineGoal, type VersionOutput } from "#core/goal.ts";
import speedrunModVersions from "#provider/speedrunModVersions.ts";

export default defineGoal({
    id: "org.mcsr.mods",
    name: "Speedrun Mods",
    provider: speedrunModVersions,

    generate(info): VersionOutput[] {
        const date = new Date();
        return [{
            version: `1.0+verified`,
            releaseTime: date.toISOString(),
            mods: info.mods
        }];
    },
    recommend: () => false,
})