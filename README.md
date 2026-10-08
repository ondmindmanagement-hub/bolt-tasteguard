# BOLT TasteGuard — Qloo cultural-fit prototype

Project by Omar Baró / Unfire for the Qloo Agentic Hackathon 2026. **Pre-incorporation, founder-led prototype.**

## What works

The Node.js server asks Qloo **Search** to resolve an exact cultural anchor (e.g. Rosalía) into an official Qloo entity ID. It then calls the official **Qloo Insights API** `/v2/insights` with that ID and a permitted entity type, and displays the actual returned entities. The browser requires human confirmation before doing anything else. **Approval is a local UI indication only**, with no bookings, purchases, publications or external tool actions.

**Verified October 8, 2026:** Qloo Search HTTP 200, Qloo Insights HTTP 200, authenticated end-to-end server-side function returned 8 real place entities anchored to the artist Rosalía, and 8 automated tests passed. This was an integration test on the developer Mac, not a public deployment or proof of market traction.

## Limitations (important)

- The city and audience fields currently provide **human-readable brief context**, but **are not passed as geographical or audience filters into Qloo Insights**. Results can be worldwide and should *not* be described as places in the indicated city. The interface explicitly warns of this.
- The system selects the first Qloo Search result; it does not support disambiguation of similarly named artists.
- This is deterministic API orchestration with a human checkpoint, **not** an autonomous commercial agent or an LLM-generated recommendation.
- We do not have third-party evaluation of recommendation quality, a client pilot, regional constraints, or certification.
- The response names are rendered as text, not interpreted as HTML, and Qloo API secrets remain on the server.

## Run locally

Requires Node.js 20+; this project no longer needs the experimental third-party Qloo harness. Get a valid official Qloo event-issued API key.

```sh
npm ci
export QLOO_API_KEY='your-secret-from-the-Qloo-email'
npm test
npm start
# open http://localhost:8080
```

Do not enter the API key in the web page, add it to git, or put it in public screenshots. For managed hosting, configure `QLOO_API_KEY` as a private environment variable.

Tests use an injected mock transport; live verification is performed separately with an actual Qloo key.

## Architecture

```text
Brief -> validation -> Qloo /search -> official entity_id
      -> Qloo /v2/insights -> returned evidence
      -> human-facing summary and approval boundary
```

MIT license. No payment required by this prototype.
