import { PistonRule } from "#schema/pistonMeta/pistonVersion.ts";
import { z } from "zod/v4";

export const SpeedrunToolsPack = z.object({
    id: z.string(),
    name: z.string(),
	type: z.string(),
	target: z.string(),
	format: z.string(),
	base: z.string(),
	homepage: z.string(),
	rules: z.array(PistonRule).optional()
});

export type SpeedrunToolsPack = z.output<typeof SpeedrunToolsPack>;


export const SpeedrunToolsIndex = z.object({
    checksum: z.object({
        type: z.string(),
        hash: z.string()
    }),
	name: z.string(),
	version: z.string(),
    releaseTime: z.coerce.date(),
	url: z.string()
});

export type SpeedrunToolsIndex = z.output<typeof SpeedrunToolsIndex>;


export const SpeedrunToolsIndexes = SpeedrunToolsPack.extend({
    versions: z.array(SpeedrunToolsIndex)
});

export type SpeedrunToolsIndexes = z.output<typeof SpeedrunToolsIndexes>;