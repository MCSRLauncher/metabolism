import { z } from "zod/v4";

export const SpeedrunMapIndex = z.object({
	name: z.string(),
	description: z.string(),
	authors: z.array(z.string()),
	sources: z.string(),
	versions: z.array(z.string()),
	downloadUrl: z.string(),
	downloadSize: z.int()
});

export type SpeedrunMapIndex = z.output<typeof SpeedrunMapIndex>;


export const SpeedrunMapIndexes = z.object({
	maps: z.array(SpeedrunMapIndex)
});

export type SpeedrunMapIndexes = z.output<typeof SpeedrunMapIndex>;