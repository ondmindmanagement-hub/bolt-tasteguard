# BOLT TasteGuard

Qloo Agentic Hackathon 2026.

BOLT TasteGuard turns a natural-language cultural brief into Qloo taste evidence, presents ranked recommendations, and stops at an explicit human approval boundary before any external action.

## Problem
General-purpose agents often substitute generic popularity for cultural fit. TasteGuard uses Qloo as the evidence layer instead of asking an LLM to guess.

## Flow
1. Human enters audience, cultural anchor, market and objective.
2. TasteGuard converts the brief into a structured Qloo recommendation request.
3. Qloo returns taste-graph recommendations.
4. TasteGuard normalizes and displays the evidence.
5. A human explicitly approves the brief.
6. No booking, publishing, outreach or spend happens silently.

## Qloo integration
The server uses the official @qloo/qloo-harness package and calls qloo recommend with a natural-language taste query, entity type, eight results, explanation and JSON output.

The Qloo credential stays server-side in QLOO_API_KEY. It is never committed or sent to the browser.

## Run
Run npm ci, set QLOO_API_KEY in the server environment, then run npm start. Open http://localhost:8080.

Tests: npm test and npm run dry-run.

Without an event-issued Qloo key, the server returns a clear waiting_for_qloo_key state instead of inventing recommendations.

## Deployment
render.yaml is included for server-side deployment. Add QLOO_API_KEY only as a private environment variable in the host.

## Status
Application, UI, tests and deployment scaffold are ready. Live Qloo validation will be added as soon as the event-issued API credential arrives.

## License
MIT.
