import { FABRIC_MAVEN, LEGACY_FABRIC_MAVEN } from "#common/constants/urls.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import { fabricIntermediaryVersions, legacyFabricIntermediaryVersions, type FabricIntermediaryVersion } from "#provider/fabrishIntermediaryVersions.ts";

const fabricIntermediary = defineGoal({
	id: "net.fabricmc.intermediary",
	name: "Fabric Intermediary",
	provider: fabricIntermediaryVersions,

	generate: data => data.map(version => transformVersion(version, FABRIC_MAVEN)),
	recommend: () => true,
});

const legacyFabricIntermediary = defineGoal({
	id: "net.legacyfabric.intermediary",
	name: "Legacy Fabric Intermediary",
	provider: legacyFabricIntermediaryVersions,

	generate: data => data.map(version => transformVersion(version, LEGACY_FABRIC_MAVEN)),
	recommend: () => true,
});

export default [fabricIntermediary, legacyFabricIntermediary];

function transformVersion(version: FabricIntermediaryVersion, maven: string): VersionOutput {
	return {
		version: version.version,
		releaseTime: version.lastModified.toISOString(),
		type: "release",

		requires: [{ uid: "net.minecraft", equals: version.version }],
		volatile: true,

		libraries: [{ name: version.maven.value, url: maven }],
	};
}
