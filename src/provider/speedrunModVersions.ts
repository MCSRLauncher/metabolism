import { SPEEDRUN_MODS_META } from "#common/constants/urls.ts";
import type { HTTPClient } from "#core/httpClient.ts";
import { defineProvider } from "#core/provider.ts";
import { SpeedrunModIndexes } from "#schema/speedrun/modsIndex.ts";

export default defineProvider({
    id: "speedrun-mod-versions",

    provide: http => provide(http, new URL("schema-6/mods.json", SPEEDRUN_MODS_META)),
});

async function provide(http: HTTPClient, meta: string | URL): Promise<SpeedrunModIndexes> {
    const list = SpeedrunModIndexes.parse((await http.getCached(meta, "mod-versions.json")).json());
    return list;
}

