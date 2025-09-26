import { PistonRule } from "#schema/pistonMeta/pistonVersion.ts";
import { z } from "zod/v4";

export const SpeedrunProgramsIndex = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	authors: z.array(z.string()),
	sources: z.string(),
	downloadPage: z.string(),
	fileFilter: z.string(),
	rules: z.array(PistonRule).optional()
});

export type SpeedrunProgramsIndex = z.output<typeof SpeedrunProgramsIndex>;


export const SpeedrunProgramsIndexes = z.object({
	programs: z.array(SpeedrunProgramsIndex)
});

export type SpeedrunProgramsIndexes = z.output<typeof SpeedrunProgramsIndex>;