import { defineGoal, type VersionOutput } from "#core/goal.ts";
import speedrunModVersions from "#provider/speedrunModVersions.ts";
import type { SpeedrunModIndex, SpeedrunModVersion } from "#schema/speedrun/modsIndex.ts";
import rawOptifines from "../../packs/optifine.json" with { type: "json" }

const optifineVersions: SpeedrunModVersion[] = rawOptifines as SpeedrunModVersion[];

export default defineGoal({
    id: "org.mcsr.mods",
    name: "Speedrun Mods",
    provider: speedrunModVersions,

    generate(info): VersionOutput[] {
		const standardSettingsId = "standardsettings";
		const defaultMCSRRankedMods = ["antigone", "fast_reset", "krypton", "lazydfu", "lazystronghold", "lithium", "sodium", "sodiummac", "sodiummac", "starlight", "voyager", "speedrunapi", "antiresourcereload", "state-output", "speedrunigt", "boundlesswindow", "retino"];

		info.mods.push({
			modid: "optifine",
			name: "OptiFine",
			description: "Minecraft optimization mod for legacy versions",
			sources: "https://optifine.net/",
			versions: optifineVersions
		})

        return [
			getMods("verified", info.mods),
			getMods("mcsrranked-all", info.mods),
			getMods("mcsrranked-standardsettings", info.mods.filter(m => defaultMCSRRankedMods.includes(m.modid) || m.modid == standardSettingsId)),
			getMods("mcsrranked-basic", info.mods.filter(m => defaultMCSRRankedMods.includes(m.modid))),
		];
    },
    recommend: () => false,
});

function getMods(name: string, list: SpeedrunModIndex[]): VersionOutput {
	const date = new Date();
	return {
		version: name,
		releaseTime: date.toISOString(),
		mods: list
	}
}