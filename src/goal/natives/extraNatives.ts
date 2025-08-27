import type { VersionFileLibrary } from "#schema/format/v1/versionFile.ts";
import { deepEquals } from "bun";
import rawNatives from "../../../packs/extraNatives.json" with { type: "json" }
// extraNatives from https://github.com/PrismLauncher/meta/blob/main/meta/common/mojang-library-patches.json

export default "skip";

interface ReplacementInfo {
	match: string[],
	override?: Partial<VersionFileLibrary>,
	additionalLibraries?: VersionFileLibrary[],
	patchAdditionalLibraries?: boolean
}

const natives: ReplacementInfo[] = rawNatives as ReplacementInfo[];

export function replaceLibraries(libraries: VersionFileLibrary[]) {
	const updates = [...libraries];

	const patched: VersionFileLibrary[] = [];
	while (updates.length) {
		const target = updates.shift()!!;

		for (const patch of natives) {
			if (patch.match.includes(target.name)) {
				if (patch.override) {
					Object.assign(target, patch.override);
				}

				if (patch.additionalLibraries) {
					(patch.patchAdditionalLibraries ? updates : patched).push(...patch.additionalLibraries);
				}
			}
		}
		patched.push(target);
	}

	const grouped = new Map<string, VersionFileLibrary[]>();

	for (const lib of patched) {
		const key = lib.name + '::' + JSON.stringify(lib.rules ?? []);
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(lib);
	}

	const result: VersionFileLibrary[] = [];

	for (const group of grouped.values()) {
		const base = structuredClone(group[0]!!);

		for (let i = 1; i < group.length; i++) {
			const current = group[i]!!;

			if (current.downloads) {
				if (!base.downloads) base.downloads = {};

				if (current.downloads.artifact) {
					if (!deepEquals(base.downloads.artifact, current.downloads.artifact)) {
						console.warn('⚠️ artifact mismatch, skipping:', base.name);
						continue
					}
				}

				if (current.downloads.classifiers) {
					base.downloads.classifiers = {
						...(base.downloads.classifiers ?? {}),
						...current.downloads.classifiers,
					};
				}
			}

			if (current.natives) {
				base.natives = {
					...(base.natives ?? {}),
					...current.natives,
				};
			}

			if (current.extract) {
				base.extract = {
					exclude: Array.from(new Set([
						...(base.extract?.exclude ?? []),
						...current.extract.exclude
					]))
				};
			}
		}

		result.push(base);
	}

	return result;
}