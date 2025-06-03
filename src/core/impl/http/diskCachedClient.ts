import { HTTPCacheMode, type CompareLocalDigestStrategy, type HTTPCacheStrategy, type HTTPClient, type Metadata, type Response } from "#core/httpClient.ts";
import { moduleLogger } from "#core/logger.ts";
import { HttpReader, TextWriter, ZipReader } from "@zip.js/zip.js";
import { pick, retry } from "es-toolkit";
import type { Logger } from "pino";
import { digest } from "../util.ts";
import { DiskCache, hasBody, type CacheEntry, type CacheEntryWithBody } from "./diskCache.ts";

const logger = moduleLogger();

export interface DiskCachedClientOptions {
	userAgent: string;
	dir: string;
	assumeUpToDate?: boolean;
}

export class DiskCachedClient implements HTTPClient {
	private logger: Logger;
	private options: DiskCachedClientOptions;
	private cache: DiskCache;

	constructor(options: DiskCachedClientOptions) {
		this.logger = logger.child({ dir: options.dir });
		this.options = options;
		this.cache = new DiskCache(options.dir);
	}

	async getCached(key: string, url: string | URL, strategy: HTTPCacheStrategy = { mode: HTTPCacheMode.ConditionalRequest }): Promise<Response> {
		return await this.cache.use(key, async ref => {
			const entry = await ref.read();

			const headers = this.makeHeaders();

			if (entry && hasBody(entry)) {
				if (strategy.mode === HTTPCacheMode.Eternal || this.options.assumeUpToDate) {
					logger.debug(`Assuming '${key}' is up-to-date`);
					return this.makeResponse(entry);
				}

				if (strategy.mode === HTTPCacheMode.CompareLocalDigest) {
					if (await this.compareLocalDigest(entry, strategy)) {
						logger.debug(`'${key}' is up-to-date (matching digest)`);
						return this.makeResponse(entry);
					} else
						logger.debug(`'${key}' needs fetch (digest mismatch)`);
				}

				if (strategy.mode === HTTPCacheMode.ConditionalRequest) {
					if (entry.eTag)
						headers.set("If-None-Match", entry.eTag);
					else if (entry.lastModified)
						headers.set("If-Modified-Since", entry.lastModified.toUTCString());
				}
			}

			const response = await this.retry(url.toString(), () => fetch(url, { headers }));

			if (strategy.mode === HTTPCacheMode.ConditionalRequest && response.status === 304 && entry && hasBody(entry)) {
				this.logger.debug(`Cache entry '${key}' is up-to-date (304)`);
				return this.makeResponse(entry);
			}

			if (!response.ok || response.status === 204)
				throw new Error(`Got ${response.status} ('${response.statusText}') while trying to GET '${url}'`);

			const newEntry = await ref.write({
				...this.parseHeaders(response.headers),
				body: { value: await response.text() }
			});

			this.logger.debug(`Cache entry '${key}' ${entry ? "created" : "updated"} with body and headers from response`);

			return this.makeResponse(newEntry);
		});
	}

	async headCached(key: string, url: string | URL): Promise<Metadata> {
		return await this.cache.use(key, async ref => {
			const entry = await ref.read();

			if (entry) {
				this.logger.debug(`Returning cached metadata for '${key}'`);
				return this.makeMetadata(entry);
			}

			const response = await this.retry(url.toString(), () => fetch(url, { method: "HEAD", headers: this.makeHeaders() }));

			if (!response.ok || response.status === 204)
				throw new Error(`Got ${response.status} ('${response.statusText}') while trying to HEAD '${url}'`);

			const newEntry = await ref.write(this.parseHeaders(response.headers));

			this.logger.debug(`Cache entry '${key}' ${entry ? "created" : "updated"} with headers from response`);

			return this.makeMetadata(newEntry);
		});
	}

	async unzipCached(key: string, url: string | URL, filename: string): Promise<string> {
		return await this.cache.use(key, async (ref) => {
			const entry = await ref.read();

			if (entry && hasBody(entry))
				return entry.body.value;

			return await this.retry(url.toString(), async () => {
				const reader = new HttpReader(url, {
					headers: this.makeHeaders(),
					useRangeHeader: true,
					forceRangeRequests: true,
				});

				const zip = new ZipReader(reader);

				for await (const zipEntry of zip.getEntriesGenerator())
					if (zipEntry.filename === filename)
						return await zipEntry.getData!(new TextWriter);

				throw new Error(`Entry not found: '${entry}'`); // TODO: causes retry
			});
		});
	}

	private async compareLocalDigest(entry: CacheEntryWithBody, strategy: CompareLocalDigestStrategy): Promise<boolean> {
		const digestResult = strategy.algorithm === "sha-1"
			? entry.body.sha1
			: await digest(strategy.algorithm, entry.body.value);

		const expected = typeof strategy.expected === "string"
			? Buffer.from(strategy.expected, "hex")
			: strategy.expected;

		return digestResult.equals(expected);
	}

	private makeHeaders() {
		return new Headers({ "user-agent": this.options.userAgent });
	}

	private parseHeaders(headers: Headers): Omit<CacheEntry, "body"> {
		const lastModifiedRaw = headers.get("last-modified");
		const lastModified = lastModifiedRaw ? new Date(lastModifiedRaw) : undefined;

		if (lastModified && isNaN(lastModified.getTime()))
			throw new Error(`Invalid Last-Modified timestamp: '${lastModifiedRaw}'`);

		return {
			eTag: headers.get("etag") ?? undefined,
			lastModified,
		};
	}

	private makeMetadata(entry: CacheEntry): Metadata {
		return pick(entry, ["eTag", "lastModified"]);
	}

	private makeResponse(entry: CacheEntryWithBody): Response {
		return {
			...this.makeMetadata(entry),
			body: entry.body.value,
			json: () => JSON.parse(entry.body.value),
		};
	}

	private retry<T>(what: string, callback: () => Promise<T>): Promise<T> {
		return retry(callback, {
			retries: 5,
			delay: attempts => {
				const period = 1000 * (2 ** attempts);
				logger.warn(`Retrying '${what}' in ${period / 1000}s`);
				return 1000 * (2 ** attempts);
			},
		});
	}
}
