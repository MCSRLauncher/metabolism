import { z } from "zod/v4";


export const SpeedrunModVersion = z.object({
    target_version: z.array(z.string()),
    version: z.string(),
    url: z.string(),
    hash: z.string(),
    obsolete: z.boolean().optional(),
    intermediary: z.array(z.string())
});

export type SpeedrunModVersion = z.output<typeof SpeedrunModVersion>;


export const SpeedrunModIndex = z.object({
    modid: z.string(),
    name: z.string(),
    description: z.string(),
    sources: z.string(),
    versions: z.array(SpeedrunModVersion),
    traits: z.array(z.string()).optional(),
    incompatibilities: z.array(z.string()).optional(),
    recommended: z.boolean().optional()
});

export type SpeedrunModIndex = z.output<typeof SpeedrunModIndex>;


export const SpeedrunModIndexes = z.object({
    mods: z.array(SpeedrunModIndex)
});

export type SpeedrunModIndexes = z.output<typeof SpeedrunModIndexes>;