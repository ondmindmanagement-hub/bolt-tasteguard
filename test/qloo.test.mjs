import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeBrief, buildTasteQuery, normalizeRecommendations, recommendTaste, searchSeed } from "../src/qloo.mjs";

test("brief requires core fields", () =>
  assert.throws(() => sanitizeBrief({ audience: "", seed: "A24", objective: "event" })));
test("unknown output type fails closed to place", () => {
  const x = sanitizeBrief({ audience: "indie fans", seed: "A24", objective: "event", type: "bad" });
  assert.equal(x.type, "urn:entity:place");
});
test("query carries audience seed location and objective", () => {
  const x = buildTasteQuery({
    audience: "indie fans", seed: "A24", objective: "event",
    location: "Copenhagen", type: "urn:entity:brand"
  }).query;
  for (const s of ["indie fans", "A24", "Copenhagen", "event"])
    assert.match(x, new RegExp(s));
});
test("normalizer handles Qloo entity shapes and bounds output", () => {
  const entities = Array.from({ length: 12 }, (_, i) =>
    ({ id: String(i), name: "E" + i, query: { affinity: 0.8 } }));
  const out = normalizeRecommendations({ results: { entities } });
  assert.equal(out.length, 8);
  assert.equal(out[0].name, "E0");
  assert.equal(out[0].affinity, 0.8);
});
test("calls real search and Insights endpoints via injected transport", async () => {
  const urls = [];
  const mock = async (url, options) => {
    urls.push({ url: url.toString(), headers: options.headers });
    if (url.pathname === "/search") return {
      ok: true, json: async () => ({
        results: [{ id: "QLOO_ID_1", name: "Example Artist" }]
      })
    };
    if (url.pathname === "/v2/insights") return {
      ok: true, json: async () => ({
        results: { entities: [{ id: "SUGGESTION_1", name: "Example Place" }] }
      })
    };
    throw new Error("Unexpected route");
  };
  const raw = await recommendTaste({
    audience: "indie fans", seed: "Example Artist", objective: "place",
    location: "Copenhagen", type: "urn:entity:place"
  }, { fetchImpl: mock, apiKey: "TEST_ONLY_NOT_REAL" });
  assert.equal(raw.source_anchor.entityId, "QLOO_ID_1");
  assert.equal(normalizeRecommendations(raw)[0].name, "Example Place");
  assert.equal(urls.length, 2);
  assert.match(urls[0].url, /\/search\?/);
  assert.match(urls[1].url, /\/v2\/insights\?/);
  assert.match(urls[1].url, /signal.interests.entities=QLOO_ID_1/);
  assert.equal(urls[0].headers["X-Api-Key"], "TEST_ONLY_NOT_REAL");
});
test("missing Qloo credentials never synthesizes output", async () => {
  await assert.rejects(searchSeed("artist", { apiKey: "", fetchImpl: () => {} }), /QLOO_API_KEY/);
});
test("invalid HTTP response is explicit", async () => {
  await assert.rejects(searchSeed("artist", {
    apiKey: "TEST_ONLY",
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ error: { reason: "Forbidden" } }) })
  }), /HTTP 403/);
});
test("no entity search match is surfaced without fabricating", async () => {
  await assert.rejects(searchSeed("no results", {
    apiKey: "TEST_ONLY",
    fetchImpl: async () => ({ ok: true, json: async () => ({ results: [] }) })
  }), /no matching taste anchor/);
});
