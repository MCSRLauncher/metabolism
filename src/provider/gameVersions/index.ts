import { OMNIARCHIVE_META, PISTON_META, PROTOCOL_VERSION_META } from "#common/constants/urls.ts";
import { HTTPCacheMode, type HTTPClient } from "#core/httpClient.ts";
import { defineProvider } from "#core/provider.ts";
import { PistonVersion, ProtocolVersion } from "#schema/pistonMeta/pistonVersion.ts";
import { PistonVersionManifest, PistonVersionRef } from "#schema/pistonMeta/pistonVersionManifest.ts";
import { orderBy } from "es-toolkit";
import { OMNIARCHIVE_MAPPINGS } from "./omniarchiveMappings.ts";

export default defineProvider({
	id: "game-versions",

	async provide(http): Promise<PistonVersion[]> {
        const protocolMeta = ProtocolVersion.array().parse((await http.getCached(new URL(PROTOCOL_VERSION_META), "game-versions/protocol")).json());
		return Promise.all([pistonMetaVersions(http, protocolMeta), omniarchiveVersions(http, protocolMeta)])
			.then(versions => orderBy(versions.flat(), [version => version.releaseTime], ["desc"]));
	}
});

async function pistonMetaVersions(http: HTTPClient, protocolMeta: ProtocolVersion[]): Promise<PistonVersion[]> {
	const base = "piston-meta";

	const manifest = PistonVersionManifest.parse(
		(await http.getCached(
			new URL("mc/game/version_manifest_v2.json", PISTON_META),
			base + "/versions.json",
		)).json()
	);

	return await getVersions(http, base, manifest.versions, protocolMeta);
}

// not all omniarchive versions - just enough to maintain backwards compat :)
async function omniarchiveVersions(http: HTTPClient, protocolMeta: ProtocolVersion[]): Promise<PistonVersion[]> {
	const base = "omniarchive";

	const manifest = PistonVersionManifest.parse(
		(await http.getCached(
			new URL("v1/manifest.json", OMNIARCHIVE_META),
			base + "/manifest.json",
		)).json()
	);

	const versions = manifest.versions
		.filter(x => Object.hasOwn(OMNIARCHIVE_MAPPINGS, x.id))
		.map(x => ({ ...x, ...OMNIARCHIVE_MAPPINGS[x.id]! }));

	return getVersions(http, base, versions, protocolMeta);
}

async function getVersions(http: HTTPClient, base: string, versions: PistonVersionRef[], protocolMeta: ProtocolVersion[]): Promise<PistonVersion[]> {
	return await Promise.all(versions.map(async (version): Promise<PistonVersion> => {
		const response = (await http.getCached(
			version.url,
			base + "/" + version.id + ".json",
			{ mode: HTTPCacheMode.CompareLocalDigest, algorithm: "sha-1", expected: version.sha1 }
		)).json();

		// manifest ID and type should take precidence - in some cases we override it
        const versionData = PistonVersion.parse(response);
        const dataVersion = protocolMeta.find(p => p.minecraftVersion == version.id)?.dataVersion;
        versionData.dataVersion = (!dataVersion || dataVersion <= 0 ? undefined : dataVersion);
		return { ...versionData, id: version.id, type: version.type };
	}));
}

