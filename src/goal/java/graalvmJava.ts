import { excludedRuntimeOS, recommendedJavaVersions } from "#common/constants/java.ts";
import { setIfAbsent } from "#common/general.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import graalvmJavaVersions from "#provider/java/graalvmJavaVersions.ts";
import type { VersionFileRuntime } from "#schema/format/v1/versionFile.ts";
import type { GraalVMJavaAsset, GraalVMJavaVersion, GraalVMJavaVersions } from "#schema/java/graalvmJavaData.ts";
import { orderBy } from "es-toolkit";

export default defineGoal({
	id: "org.graalvm.java",
	name: "GraalVM Java",
	provider: graalvmJavaVersions,

	generate(info): VersionOutput[] {
		const result: VersionOutput[] = [];

		const majorVersions: Map<number, GraalVMJavaAsset[]> = new Map;

		for (const entry of info) {
			if (!entry.draft && !entry.prerelease && entry.tag_name.startsWith("jdk-")) {
				if (entry.assets.length) {
					const majorVersion = +entry.tag_name.split("-")[1]?.split(".")[0]!!;
					setIfAbsent(majorVersions, majorVersion, []).push(...entry.assets);
				}
			}
		}

		for (const [majorVersion, entries] of majorVersions) {
			majorVersions.set(
				majorVersion,
				orderBy(entries, [entry => entry.created_at], ["desc"])
			);
		}

		for (const [majorVersion, entries] of majorVersions) {
			result.push({
				version: "java" + majorVersion,
				releaseTime: entries.at(-1)!.created_at.toISOString(),

				runtimes: entries.map(transformRuntime)
					.filter(x => !excludedRuntimeOS.includes(x.runtimeOS))
			});
		}

		return result;
	},
	recommend: (_, output) => recommendedJavaVersions.includes(+output.version.replace(/[^0-9]/g, "")),
});

function getOSType(entry: GraalVMJavaAsset): string {
	let osName = "";
	if (entry.name.includes("linux")) {
		osName = "linux";
	}
	if (entry.name.includes("windows")) {
		osName = "windows";
	}
	if (entry.name.includes("macos")) {
		osName = "mac-os";
	}

	let architecture = "";
	if (entry.name.includes("aarch64")) {
		architecture = "arm64";
	}
	if (entry.name.includes("x64")) {
		architecture = "x64";
	}

	return `${osName}-${architecture}`;
}

function transformRuntime(entry: GraalVMJavaAsset): VersionFileRuntime {
	const version = entry.name.split("jdk-")[1]?.split("_")[0]?.split(".").map(x => +x)!!;
	const vendor = "oracle";
	const name = `${vendor}_graalvm_jdk${version[0]}.${version[1]}.${version[2]}`;
	const downloadType = "archive";
	const packageType = "jdk";
	const releaseTime = entry.created_at.toISOString();

	return {
		name,
		runtimeOS: getOSType(entry),

		version: {
			major: version[0] || 0,
			minor: version[1] || 0,
			security: version[2] || 0
		},
		releaseTime,
		vendor,
		packageType,

		downloadType,
		checksum: {
			type: entry.digest!!.split(":")[0] as ("sha256" | "sha1"),
			hash: entry.digest!!.split(":")[1] || "",
		},
		url: entry.browser_download_url,
	};
}

