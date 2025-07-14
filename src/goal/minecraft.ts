import { throwError } from "#common/general.ts";
import { isLWJGL2, isLWJGL2Dependency, isLWJGL3 } from "#common/transformation/maven.ts";
import { isPlatformLibrary, transformArgs, transformPistonLibrary } from "#common/transformation/pistonMeta.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import pistonMetaGameVersions from "#provider/gameVersions/index.ts";
import { VersionFileTrait, type VersionFileDependency } from "#schema/format/v1/versionFile.ts";
import { MavenArtifactRef } from "#schema/mavenArtifactRef.ts";
import type { PistonLibrary, PistonVersion } from "#schema/pistonMeta/pistonVersion.ts";

export default defineGoal({
	id: "net.minecraft",
	name: "Minecraft",
	provider: pistonMetaGameVersions,

	generate: data => data.map(transformVersion),
	recommend: (first, version) => first && version.type === "release",
});

function transformVersion(version: PistonVersion): VersionOutput {
	const requires: VersionFileDependency[] = [];
	const traits: VersionFileTrait[] = [];
	let mainClass: string | undefined = version.mainClass;

	let libraries = version.libraries;

	libraries = libraries.filter(x => !processLWJGL(x, requires, traits));

	if (mainClass?.startsWith("net.minecraft.launchwrapper.")) {
		// https://api.github.com/repos/MCSRLauncher/LegacyLauncher/releases
		libraries = libraries.map(x => {
			if (x.name.value.startsWith("net.minecraft:launchwrapper:")) {
				return {
					name: MavenArtifactRef.parse("net.minecraft:launchwrapper:1.13"),
					downloads: {
						artifact: {
							url: 'https://github.com/MCSRLauncher/LegacyLauncher/releases/download/1.13/LegacyLauncher-1.13.jar',
							sha1: "5499c9a63920fe569a4ac34db05833d70ddb39e6",
							size: 40834
						}
					}
				}
			} else return x;
		});
		// libraries = libraries.filter(
		// 	x => !x.name.value.startsWith("net.minecraft:launchwrapper:")
		// 		&& x.name.group !== "net.sf.jopt-simple"
		// 		&& x.name.group !== "org.ow2.asm"
		// );

		// mainClass = undefined;
		traits.push(VersionFileTrait.LegacyLaunch);
	}

	if (version.arguments?.game) {
		const featureObjects = version.arguments.game
			.filter(x => typeof x === "object")
			.flatMap(x => x.rules)
			.map(x => x.features)
			.filter(x => typeof x === "object");

		if (featureObjects.some(x => x.is_quick_play_singleplayer))
			traits.push(VersionFileTrait.QuickPlaySingleplayerAware);

		if (featureObjects.some(x => x.is_quick_play_multiplayer))
			traits.push(VersionFileTrait.QuickPlayMultiplayerAware);
	}

	return {
		version: version.id,
		type: version.type,
		releaseTime: version.releaseTime.toISOString(),

		requires,

		"+traits": traits,

		compatibleJavaMajors: [version?.javaVersion?.majorVersion].filter(x => x !== undefined),
		compatibleJavaName: version.javaVersion?.component,
		mainClass,
		minecraftArguments: version.minecraftArguments
			?? (version.arguments?.game ? transformArgs(version.arguments.game) : undefined)
			?? throwError("Neither minecraftArguments nor arguments.game present"),

		mainJar: {
			name: `com.mojang:minecraft:${version.id}:client`,
			downloads: { artifact: version.downloads.client }
		},
		logging: version.logging?.client,
		assetIndex: version.assetIndex,
		libraries: libraries.map(transformPistonLibrary),
	};
}

function processLWJGL(lib: PistonLibrary, requires: VersionFileDependency[], traits: VersionFileTrait[]) {
	if (isLWJGL2Dependency(lib.name))
		return true;

	const lwjgl2 = isLWJGL2(lib.name);
	const lwjgl3 = isLWJGL3(lib.name);

	if (lwjgl2 || lwjgl3) {
		// determine version based on non-pltaform-specific libraries in case the version varies
		if (isPlatformLibrary(lib))
			return true;

		const uid = lwjgl3 ? "org.lwjgl3" : "org.lwjgl";
		const existing = requires.find(x => x.uid === uid);

		if (existing) {
			if (existing.suggests !== lib.name.version)
				throw new Error(`Multiple versions of LWJGL specified! (both '${existing.suggests}' and '${lib.name.version}' present)`);
			else
				return true;
		}

		if (lwjgl3)
			traits.push(VersionFileTrait.UseFirstThreadOnMacOS);

		requires.push({ uid, suggests: lib.name.version });
		return true;
	}

	return false;
}
