import type { CapturedRequest } from './types/requests';
import type { ExtensionSettings, IncludeDomainRule } from './types/settings';

function tryHostname(url: string): string | null {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return null;
	}
}

function tryHostFromInspectedTab(
	inspectedTabUrl: string | undefined,
): string | null {
	if (!inspectedTabUrl) {
		return null;
	}
	return tryHostname(inspectedTabUrl);
}

function normalizeExtensionEntry(raw: string): string {
	const t = raw.trim().toLowerCase();
	if (!t) {
		return '';
	}
	return t.startsWith('.') ? t : `.${t}`;
}

/**
 * Path “extension” = substring from the last dot in the last path segment
 * (e.g. `/a/b.JPG` → `.jpg`, `/file` → `""`).
 */
export function pathnameExtension(url: string): string {
	try {
		const { pathname } = new URL(url);
		const base = pathname.split('/').pop() ?? '';
		const dot = base.lastIndexOf('.');
		if (dot <= 0 || dot === base.length - 1) {
			return '';
		}
		return base.slice(dot).toLowerCase();
	} catch {
		return '';
	}
}

function ruleMatchesHost(
	rule: IncludeDomainRule,
	requestUrl: string,
	inspectedTabUrl: string | undefined,
): boolean {
	const host = tryHostname(requestUrl);
	if (!host) {
		return false;
	}
	if (rule.kind === 'current-tab-host') {
		const tabHost = tryHostFromInspectedTab(inspectedTabUrl);
		if (!tabHost) {
			return false;
		}
		return host === tabHost;
	}
	try {
		const re = new RegExp(rule.pattern);
		return re.test(host);
	} catch {
		return false;
	}
}

/**
 * Domain / method / static-extension gate for DevTools first-pass filtering.
 *
 * Semantics:
 * - **Methods**: request method must be listed in `filter.methods`.
 * - **Exclude extensions**: pathname extension (see {@link pathnameExtension}) must not
 *   be in `filter.excludeExtensions` (case-insensitive, entries may omit leading dot).
 * - **Include rules**: when `includeDomainRules` is **empty**, no domain restriction (pass).
 *   When non-empty, **hostname** must satisfy **at least one** rule: `regex` matches host,
 *   or `current-tab-host` matches the host of `inspectedTabUrl` to the request host.
 */
export function passesFilter(
	request: CapturedRequest,
	settings: ExtensionSettings,
): boolean {
	const { filter } = settings;

	if (!filter.methods.includes(request.method)) {
		return false;
	}

	const ext = pathnameExtension(request.url);
	const excluded = filter.excludeExtensions
		.map(normalizeExtensionEntry)
		.filter(Boolean);
	if (ext && excluded.includes(ext)) {
		return false;
	}

	if (filter.includeDomainRules.length === 0) {
		return true;
	}

	return filter.includeDomainRules.some((rule) =>
		ruleMatchesHost(rule, request.url, request.inspectedTabUrl),
	);
}
