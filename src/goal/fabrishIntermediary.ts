import { FABRIC_MAVEN, LEGACY_FABRIC_MAVEN } from "#common/constants/urls.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import { fabricIntermediaryVersions, type FabricIntermediaryVersion } from "#provider/fabrishIntermediaryVersions.ts";

const fabricIntermediary = defineGoal({
	id: "net.fabricmc.intermediary",
	name: "Fabric Intermediary",
	provider: fabricIntermediaryVersions,

	generate: data => data.map(version => transformVersion(version)),
	recommend: () => true,
});

export default [fabricIntermediary];

function transformVersion(version: FabricIntermediaryVersion): VersionOutput {
	return {
		version: version.version,
		releaseTime: version.lastModified.toISOString(),
		type: "release",

		requires: [{ uid: "net.minecraft", equals: version.version }],
		volatile: true,

		libraries: [{ name: version.maven.value, url: version.maven.value.startsWith('net.fabricmc') ? FABRIC_MAVEN : LEGACY_FABRIC_MAVEN }],
	};
}
