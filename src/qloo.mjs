/**
 * Qloo Taste AI client. All Qloo requests originate server-side.
 *
 * One signal is resolved using Qloo's official /search endpoint; recommendations
 * then come exclusively from /v2/insights, not from fabricated LLM text.
 * No API secret is included in this repository or sent to the browser.
 */
const BASE = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const TYPES = new Set([
  "urn:entity:movie", "urn:entity:tv_show", "urn:entity:book",
  "urn:entity:brand", "urn:entity:artist", "urn:entity:place",
  "urn:entity:videogame", "urn:entity:podcast"
]);

export function sanitizeBrief(input = {}) {
  const clean = (value, max = 160) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  const audience = clean(input.audience);
  const location = clean(input.location);
  const seed = clean(input.seed);
  const objective = clean(input.objective);
  const type = TYPES.has(input.type) ? input.type : "urn:entity:place";
  if (!audience || !seed || !objective) throw new Error("audience, seed and objective are required");
  return { audience, location, seed, objective, type };
}

export function buildTasteQuery(input) {
  const { audience, location, seed, objective, type } = sanitizeBrief(input);
  const where = location ? " in " + location : "";
  const typeLabel = type.split(":").at(-1).replaceAll("_", " ");
  return {
    type,
    query: typeLabel + " recommendations" + where + ' for an audience described as "' +
      audience + '", anchored by "' + seed + '", for the objective "' +
      objective + '". Prioritize coherent cultural affinity over generic popularity.'
  };
}

async function qlooGet(path, params, { fetchImpl = fetch, apiKey = process.env.QLOO_API_KEY } = {}) {
  if (!apiKey) {
    const e = new Error("QLOO_API_KEY is not configured");
    e.code = "QLOO_KEY_MISSING";
    throw e;
  }
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const res = await fetchImpl(url, {
    method: "GET",
    headers: { "X-Api-Key": apiKey, "Accept": "application/json" },
    signal: AbortSignal.timeout(20000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error("Qloo " + path + " HTTP " + res.status +
      (data?.error?.reason ? ": " + String(data.error.reason).slice(0, 90) : ""));
    e.code = "QLOO_API_ERROR";
    throw e;
  }
  return data;
}

export function normalizeRecommendations(raw) {
  const candidates = raw?.results?.entities ?? raw?.results ?? raw?.entities ??
    raw?.data?.results?.entities ?? raw?.data?.entities ?? [];
  if (!Array.isArray(candidates)) return [];
  return candidates.slice(0, 8).map((item, index) => ({
    rank: index + 1,
    id: item?.entity_id ?? item?.id ?? item?.urn ?? null,
    name: item?.name ?? item?.properties?.name ?? item?.title ??
      item?.entity?.name ?? ("Recommendation " + (index + 1)),
    type: item?.subtype ?? item?.entity_type ?? item?.type ?? null,
    affinity: item?.query?.affinity ?? item?.affinity ?? item?.score ?? null,
    raw: item
  }));
}

/** Resolve the cultural anchor with Qloo itself; never invent an entity ID. */
export async function searchSeed(seed, opts = {}) {
  const clean = String(seed || "").trim();
  if (!clean) throw new Error("Cultural anchor is required");
  const short = clean.split(/\s+(?:and|&)\s+/i)[0].trim().slice(0, 80);
  // Search types are explicit to avoid using unsupported generic search types.
  for (const type of ["urn:entity:artist", "urn:entity:brand", "urn:entity:movie"]) {
    const data = await qlooGet("/search", { query: short, type, limit: 6 }, opts);
    const candidates = data?.results ?? data?.entities ?? [];
    const valid = (Array.isArray(candidates) ? candidates : []).find(x => x?.id || x?.entity_id);
    if (valid) return {
      entityId: valid.entity_id || valid.id,
      entityName: valid.name || valid.properties?.name || short,
      entityType: type
    };
  }
  const e = new Error("Qloo search returned no matching taste anchor; try a film, artist or brand");
  e.code = "QLOO_NO_MATCH";
  throw e;
}

/** Only Qloo Insights may supply recommendation candidates. */
export async function recommendTaste(input, opts = {}) {
  const { seed, type } = sanitizeBrief(input);
  const match = await searchSeed(seed, opts);
  const result = await qlooGet("/v2/insights", {
    "filter.type": type,
    "signal.interests.entities": match.entityId,
    "take": 8,
    "feature.explainability": "true"
  }, opts);
  return { ...result, source_anchor: match };
}
