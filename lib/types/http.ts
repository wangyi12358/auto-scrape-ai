/**
 * HTTP verbs we care about for scraping / API replay.
 * Options UI may expose a subset; DevTools still reports the actual method.
 */
export const HTTP_METHODS = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
	'OPTIONS',
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];
