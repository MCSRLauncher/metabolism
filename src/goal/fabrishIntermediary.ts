import { defineGoal, type VersionOutput } from "#core/goal.ts";
import { fabricIntermediaryVersions, type FabricIntermediaryVersion } from "#provider/fabrishIntermediaryVersions.ts";
import type { VersionFileLibrary } from "#schema/format/v1/versionFile.ts";

const fabricIntermediary = defineGoal({
	id: "net.fabricmc.intermediary",
	name: "Fabric Intermediary",
	provider: fabricIntermediaryVersions,

	generate: data => data.map(version => transformVersion(version)),
	recommend: () => true,
});

export default [fabricIntermediary];

function transformVersion(version: FabricIntermediaryVersion): VersionOutput {
	const intermediraries: Record<string, VersionFileLibrary> = {};
	for (const intermediaryInfo of version.intermediraries) {
		intermediraries[intermediaryInfo.intermediary.maven.getId()] = { name: intermediaryInfo.intermediary.maven.value, url: intermediaryInfo.url }
	}

	return {
		version: version.version,
		releaseTime: version.lastModified.toISOString(),
		type: "release",

		requires: [{ uid: "net.minecraft", equals: version.version }],
		volatile: true,

		compatibleIntermediaries: version.intermediraries.map(i => i.intermediary.maven.getId()),
		intermediaryLibraries: intermediraries
	};
}
