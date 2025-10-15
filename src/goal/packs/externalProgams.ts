import { defineGoal, type VersionOutput } from "#core/goal.ts";
import { defineProvider } from "#core/provider.ts";
import { GitHubRelease } from "#schema/githubReleaseRef.ts";
import type { PistonRule } from "#schema/pistonMeta/pistonVersion.ts";
import type { SpeedrunProgramsIndex } from "#schema/speedrun/programsIndex.ts";
import rawPrograms from "../../../packs/externalPrograms.json" with { type: "json" }

interface ProgramInfo {
	id: string,
	type: string,
	target: string,
	targetVersion?: string,
	name: string,
	authors: string[]
	description: string,
	fileFilter: string,
	rules?: PistonRule[]
}

const programs: ProgramInfo[] = rawPrograms as ProgramInfo[];

const providor = defineProvider({
	id: "external-programs",
	async provide(http) {
		return Promise.all(programs.map(async program => {
			if (program.type == "github") {
				const release = GitHubRelease.parse(
					(await http.getCached(new URL(`https://api.github.com/repos/${program.target}/releases/${program.targetVersion ? `tags/${program.targetVersion}` : "latest"}`), `externalprogram-${program.type}-${program.target.replace("/", "_")}.json`)).json()
				);

				return {
					program: program,
					source: `https://github.com/${program.target}`,
					res: release,
					downloadPage: release.html_url
				};
			} else {
				throw "Illegal map type argument";
			}
		}));
	}
});

export default defineGoal({
	id: "org.mcsr.programs",
	name: "Speedrun Tools",
	provider: providor,
	generate(info): VersionOutput[] {
		const result: SpeedrunProgramsIndex[] = [];

		for (const programInfo of info) {
			if (!programInfo) continue;
			result.push({
				id: programInfo.program.id,
				name: programInfo.program.name,
				description: programInfo.program.description,
				authors: programInfo.program.authors,
				sources: programInfo.source,
				downloadPage: programInfo.downloadPage,
				fileFilter: programInfo.program.fileFilter,
				rules: programInfo.program.rules,
			})
		}

		let releaseTime: Date | null = null;
		info.forEach(i => {
			if (!i) return;
			if (!releaseTime || +releaseTime < i.res.published_at.getTime()) {
				releaseTime = i.res.published_at;
			}
		})
		if (!releaseTime) releaseTime = new Date();

		return [{
			version: "verified",
			releaseTime: releaseTime.toISOString(),
			programs: result
		}];
	},
	recommend: () => false
});