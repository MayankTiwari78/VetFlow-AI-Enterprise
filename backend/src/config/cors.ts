/**
 * Shared cross-origin policy for the browser apps and the API.
 *
 * The patient web app and the veterinarian console are deployed on Vercel while
 * the API runs on Render, so browser requests are cross-origin *and*
 * credentialed (the refresh token lives in an httpOnly cookie). That combination
 * requires an explicit `Access-Control-Allow-Origin` echo — the `*` wildcard is
 * rejected by the Fetch spec once credentials are involved — together with
 * `Access-Control-Allow-Credentials: true` and a successful OPTIONS preflight.
 *
 * Accepted origins are:
 *   1. every explicitly configured origin (`CLIENT_URL`, `ADMIN_URL`,
 *      `CORS_ALLOWED_ORIGINS`) — production and any custom domain,
 *   2. Vercel production + preview deployment URLs of the configured projects
 *      (`https://<project>.vercel.app` and `https://<project>-*.vercel.app`),
 *   3. the local development servers, outside production only.
 */

const VERCEL_HOST_SUFFIX = ".vercel.app";

/** Vercel project slugs are DNS labels; deployment hosts extend them after a dash. */
const dnsLabelPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** Local origins served by the patient app and the console during development. */
export const LOCAL_DEVELOPMENT_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3010",
  "http://127.0.0.1:3010",
  "http://localhost:3011",
  "http://127.0.0.1:3011"
];

export interface ParsedOriginList {
  origins: string[];
  invalid: string[];
}

export interface CorsOriginPolicyOptions {
  clientUrl?: string;
  adminUrl?: string;
  /** Extra exact origins, already split and validated (see `parseOriginList`). */
  extraOrigins?: readonly string[];
  /** Vercel project slugs whose deployment URLs are trusted (see `parseProjectSlugs`). */
  vercelPreviewProjects?: readonly string[];
  /** Local development origins are only trusted outside production. */
  isDevelopment?: boolean;
  localDevelopmentOrigins?: readonly string[];
}

export interface CorsOriginPolicy {
  /** Exact origins accepted verbatim (normalised scheme + host + port). */
  readonly allowedOrigins: ReadonlySet<string>;
  /** Vercel projects whose `*.vercel.app` production/preview URLs are accepted. */
  readonly vercelPreviewProjects: readonly string[];
  isAllowedOrigin(origin: string | undefined): boolean;
}

/**
 * Normalises a configured origin so that a trailing slash, a document path or
 * mixed casing (all easy to introduce through env vars, e.g.
 * `https://app.example.com/`) cannot silently break origin matching.
 */
export const normalizeOrigin = (value: string | undefined | null): string | undefined => {
  const candidate = value?.trim();

  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }

    return parsed.origin;
  } catch {
    return undefined;
  }
};

/**
 * Splits a comma or whitespace separated origin list (for example the
 * `CORS_ALLOWED_ORIGINS` env value) and reports entries that are not usable
 * origins so they can be logged instead of failing silently.
 */
export const parseOriginList = (value: string | undefined | null): ParsedOriginList => {
  const entries = (value ?? "")
    .split(/[\s,]+/)
    .filter((entry) => entry.length > 0);
  const origins: string[] = [];
  const invalid: string[] = [];

  for (const entry of entries) {
    const origin = normalizeOrigin(entry);

    if (origin) {
      origins.push(origin);
    } else {
      invalid.push(entry);
    }
  }

  return { origins, invalid };
};

/** Splits a comma or whitespace separated list of Vercel project slugs. */
export const parseProjectSlugs = (value: string | undefined | null): string[] => {
  const entries = (value ?? "")
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return [...new Set(entries.filter((entry) => dnsLabelPattern.test(entry)))];
};

/** Returns the `<label>` of a `https://<label>.vercel.app` origin, else undefined. */
const httpsVercelHostLabel = (origin: string): string | undefined => {
  try {
    const { protocol, hostname, port } = new URL(origin);

    // Vercel always serves deployments over https on the default port, so a
    // scheme or port mismatch means this is not a Vercel deployment host.
    if (protocol !== "https:" || port || !hostname.endsWith(VERCEL_HOST_SUFFIX)) {
      return undefined;
    }

    return hostname.slice(0, -VERCEL_HOST_SUFFIX.length) || undefined;
  } catch {
    return undefined;
  }
};

/** Vercel project slug implied by a `https://<project>.vercel.app` origin. */
const vercelProjectFromOrigin = (origin: string): string | undefined => {
  const label = httpsVercelHostLabel(origin);

  if (!label) {
    return undefined;
  }

  // Only the canonical `<project>.vercel.app` host maps unambiguously onto a
  // project slug; suffixed hosts are already covered by that slug's pattern.
  return dnsLabelPattern.test(label) ? label : undefined;
};

const isVercelDeploymentOrigin = (origin: string, projects: readonly string[]): boolean => {
  const label = httpsVercelHostLabel(origin);

  if (!label || !dnsLabelPattern.test(label)) {
    return false;
  }

  return projects.some((project) => label === project || label.startsWith(`${project}-`));
};

/**
 * Builds the credential-safe origin policy used by the CORS middleware and the
 * CSRF origin guard. Origins are matched exactly; Vercel deployment URLs are
 * matched by project prefix; a `*` wildcard is never produced.
 */
export const createCorsOriginPolicy = (options: CorsOriginPolicyOptions = {}): CorsOriginPolicy => {
  const allowed = new Set<string>();

  const addOrigin = (value: string | undefined | null): void => {
    const origin = normalizeOrigin(value);

    if (origin) {
      allowed.add(origin);
    }
  };

  addOrigin(options.clientUrl);
  addOrigin(options.adminUrl);

  for (const origin of options.extraOrigins ?? []) {
    addOrigin(origin);
  }

  if (options.isDevelopment) {
    for (const origin of options.localDevelopmentOrigins ?? LOCAL_DEVELOPMENT_ORIGINS) {
      addOrigin(origin);
    }
  }

  // Configured Vercel deployment URLs also register their project so sibling
  // preview deployments of the same project keep working after a redeploy.
  const projects = new Set<string>(options.vercelPreviewProjects ?? []);

  for (const origin of allowed) {
    const project = vercelProjectFromOrigin(origin);

    if (project) {
      projects.add(project);
    }
  }

  const allowedOrigins: ReadonlySet<string> = allowed;
  const vercelPreviewProjects = [...projects].sort();

  return {
    allowedOrigins,
    vercelPreviewProjects,
    isAllowedOrigin(origin) {
      const candidate = normalizeOrigin(origin) ?? origin?.trim();

      if (!candidate) {
        return false;
      }

      if (allowedOrigins.has(candidate)) {
        return true;
      }

      return isVercelDeploymentOrigin(candidate, vercelPreviewProjects);
    }
  };
};