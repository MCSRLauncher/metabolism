import { FABRIC_INTERMEDIARY_META, FABRIC_MAVEN, LEGACY_FABRIC_INTERMEDIARY_META, LEGACY_FABRIC_INTERMEDIARY_V2_XML, LEGACY_FABRIC_MAVEN, ORNITHEMC_INTERMEDIARY_GEN1_META, ORNITHEMC_INTERMEDIARY_GEN2_META, ORNITHEMC_MAVEN } from "#common/constants/urls.ts";
import type { HTTPClient } from "#core/httpClient.ts";
import { defineProvider } from "#core/provider.ts";
import { FabricMetaVersion, FabricMetaVersions } from "#schema/fabric/fabricMeta.ts";
import { convertXML } from "simple-xml-to-json";

export const fabricIntermediaryVersions = defineProvider({
	id: "fabric-intermediary-versions",
	provide: http => provideFabric(http),
});

export default [fabricIntermediaryVersions];

export interface FabricIntermediaryVersion {
	version: string
	intermediraries: {
		intermediary: FabricMetaVersion,
		url: string
	}[];
	lastModified: Date;
}

const customVersions = [
	{

	}
];

async function provideFabric(http: HTTPClient) {
	return Promise.all([
		provide(http, new URL(FABRIC_INTERMEDIARY_META), FABRIC_MAVEN, 'fabric'),
		provide(http, new URL(LEGACY_FABRIC_INTERMEDIARY_META), LEGACY_FABRIC_MAVEN, 'legacy_fabric'),
		provideFromXML(http, LEGACY_FABRIC_INTERMEDIARY_V2_XML, LEGACY_FABRIC_MAVEN, 'legacy_fabric_v2'),
		provide(http, new URL(ORNITHEMC_INTERMEDIARY_GEN1_META), ORNITHEMC_MAVEN, 'ornithemc_gen1'),
		provide(http, new URL(ORNITHEMC_INTERMEDIARY_GEN2_META), ORNITHEMC_MAVEN, 'ornithemc_gen2')
	]).then((versionFetches) => {
		const result: FabricIntermediaryVersion[] = [];
		for (const versions of versionFetches) {
			for (const version of versions) {
				const index = result.findIndex(v => v.version == version.version);
				if (index == -1) {
					result.push(version);
				} else if (result[index]) {
					result[index].intermediraries.push(...version.intermediraries);
					result[index].lastModified = new Date(Math.max(result[index]?.lastModified.getTime() || 0, version.lastModified.getTime()));
				}
			}
		}
		return result;
	})
}

async function provide(http: HTTPClient, meta: string | URL, maven: string, id: string): Promise<FabricIntermediaryVersion[]> {
	const list = FabricMetaVersions.parse(
		(await http.getCached(
			meta,
			`intermediary-versions-${id}.json`,
		)).json()
	);

	return await Promise.all(list
		// for ornithmc
		.filter(v => !v.versionNoSide || v.version == v.versionNoSide || v.version.endsWith('-client'))
		.map(async (version): Promise<FabricIntermediaryVersion> => transformVersion(http, maven, id, version)));
}

async function provideFromXML(http: HTTPClient, xmlUrl: string | URL, maven: string, id: string): Promise<FabricIntermediaryVersion[]> {
	const xmlData = convertXML((await http.getCached(
		xmlUrl,
		`intermediary-versions-${id}.xml`,
	)).body)

	// console.log(JSON.stringify(xmlData));
	// return [];
	const name = `${xmlData.metadata.children.find((c: { groupId?: { content: string } }) => c.groupId).groupId.content}:${xmlData.metadata.children.find((c: { artifactId?: { content: string } }) => c.artifactId).artifactId.content}`
	const versions = xmlData.metadata.children.find((c: { versioning?: { content: string } }) => c.versioning).versioning.children;

	const list = FabricMetaVersions.parse(versions.find((c: { versions?: { children: any[] }; }) => c.versions)
		.versions.children.map((v: { version: { content: string } }) => ({ maven: `${name}:${v.version.content}`, version: v.version.content })));

	return await Promise.all(list
		// for ornithmc
		.map(async (version): Promise<FabricIntermediaryVersion> => transformVersion(http, maven, id, version)));
}

async function transformVersion(http: HTTPClient, maven: string, id: string, version: FabricMetaVersion): Promise<FabricIntermediaryVersion> {
	const infoResponse = await http.headCached(
		version.maven.url(maven, "jar"),
		version.version + "-" + id + ".jar"
	);

	if (!infoResponse.lastModified)
		throw new Error("Missing Last-Modified header");

	return {
		version: version.versionNoSide || version.version,
		intermediraries: [{ intermediary: version, url: maven }],
		lastModified: infoResponse.lastModified,
	};
}