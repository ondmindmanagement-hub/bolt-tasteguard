import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const QLOO_BIN = path.resolve(HERE, "../node_modules/.bin/qloo");
const TYPES = new Set([
  "urn:entity:movie","urn:entity:tv_show","urn:entity:book","urn:entity:brand",
  "urn:entity:artist","urn:entity:place","urn:entity:videogame","urn:entity:podcast"
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
    query: typeLabel + " recommendations" + where + ' for an audience described as "' + audience +
      '", anchored by "' + seed + '", for the objective "' + objective +
      '". Prioritize coherent cultural affinity over generic popularity.'
  };
}

function runQloo(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(QLOO_BIN, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("Qloo request timed out")); }, 15000);
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || ("Qloo exited with status " + code)));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error("Qloo returned non-JSON output")); }
    });
  });
}

export async function recommendTaste(input, opts = {}) {
  const { type, query } = buildTasteQuery(input);
  if (!process.env.QLOO_API_KEY && !opts.allowWithoutKey) {
    const error = new Error("QLOO_API_KEY is not configured");
    error.code = "QLOO_KEY_MISSING";
    throw error;
  }
  const args = ["recommend", query, "--type", type, "--take", "8", "--explain", "--json"];
  if (opts.dryRun) args.push("--dry-run");
  return runQloo(args, opts.env ?? process.env);
}

export function normalizeRecommendations(raw) {
  const candidates = raw?.results?.entities ?? raw?.results ?? raw?.entities ??
    raw?.data?.results?.entities ?? raw?.data?.entities ?? [];
  if (!Array.isArray(candidates)) return [];
  return candidates.slice(0,8).map((item,index) => ({
    rank:index+1,
    id:item?.entity_id ?? item?.id ?? item?.urn ?? null,
    name:item?.name ?? item?.properties?.name ?? item?.title ?? item?.entity?.name ?? ("Recommendation " + (index+1)),
    type:item?.type ?? item?.entity_type ?? item?.subtype ?? null,
    affinity:item?.affinity ?? item?.score ?? item?.properties?.affinity ?? item?.query?.affinity ?? null,
    raw:item
  }));
}
