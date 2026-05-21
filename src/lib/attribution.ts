export const ATTRIBUTION_STORAGE_KEY = "hf-attribution-v1";

export const ATTRIBUTION_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid",
] as const;

export type AttributionParamKey = (typeof ATTRIBUTION_PARAM_KEYS)[number];

export type AttributionData = Partial<Record<AttributionParamKey, string>> & {
  first_landing_page?: string;
  landing_page?: string;
  first_referrer?: string;
  referrer?: string;
  captured_at?: string;
  updated_at?: string;
};

function cleanValue(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function getExternalReferrer(): string | undefined {
  if (typeof document === "undefined" || !document.referrer) return undefined;

  try {
    const referrer = new URL(document.referrer);
    if (referrer.hostname === window.location.hostname) return undefined;
    return referrer.toString();
  } catch {
    return document.referrer;
  }
}

export function getStoredAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function captureAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  const current = getStoredAttribution();
  const url = new URL(window.location.href);
  const now = new Date().toISOString();
  const params: Partial<Record<AttributionParamKey, string>> = {};

  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = cleanValue(url.searchParams.get(key));
    if (value) params[key] = value;
  }

  const referrer = getExternalReferrer();
  const next: AttributionData = {
    ...current,
    ...params,
    first_landing_page: current.first_landing_page ?? url.toString(),
    landing_page: url.toString(),
    first_referrer: current.first_referrer ?? referrer,
    referrer: referrer ?? current.referrer,
    captured_at: current.captured_at ?? now,
    updated_at: now,
  };

  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can fail in private browsing; attribution is best-effort.
  }

  return next;
}

export function getClientAttribution(): AttributionData {
  const stored = getStoredAttribution();
  if (typeof window === "undefined") return stored;

  return {
    ...stored,
    landing_page: window.location.href,
    referrer: getExternalReferrer() ?? stored.referrer,
    updated_at: new Date().toISOString(),
  };
}

export function appendAttributionToUrl(url: string, attribution: AttributionData): string {
  try {
    const next = new URL(url);

    for (const key of ATTRIBUTION_PARAM_KEYS) {
      const value = attribution[key];
      if (value) next.searchParams.set(key, value);
    }

    if (attribution.first_landing_page) {
      next.searchParams.set("hf_landing_page", attribution.first_landing_page);
    }
    if (attribution.first_referrer) {
      next.searchParams.set("hf_referrer", attribution.first_referrer);
    }

    return next.toString();
  } catch {
    return url;
  }
}

export function formatAttribution(data?: AttributionData): string {
  if (!data || Object.keys(data).length === 0) return "";

  const lines: string[] = [];
  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = data[key];
    if (value) lines.push(`${key}: ${value}`);
  }
  if (data.first_landing_page) lines.push(`first_landing_page: ${data.first_landing_page}`);
  if (data.landing_page) lines.push(`landing_page: ${data.landing_page}`);
  if (data.first_referrer) lines.push(`first_referrer: ${data.first_referrer}`);
  if (data.referrer) lines.push(`referrer: ${data.referrer}`);

  return lines.length ? lines.join("\n") : "";
}
