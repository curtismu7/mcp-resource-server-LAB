# Rule 19 waiver — mcp-resource-server (owner decision, 2026-11-07)

Rule 19 of `STANDALONE-RULES.md` requires Mock mode, Real mode and a visible Mock / Real toggle in the header of every page, backed by `POST /api/mode` and `GET /api/info`. **mcp-resource-server is a headless, API-only Tool-tier app: an MCP server with no UI** (see `docs/talk-track.md`, "No UI, by design"). There is no page to put a toggle on, so rule 19 cannot pass, and its conformance result is an approved waiver by owner decision (2026-11-07). Precedent: `idjag-runner-LAB/docs/rule-19-waiver.md`.

What the lab does instead: it runs offline from its bundled SQLite and verticals, answers on loopback only, and protects its tools with a token (RFC 9728 metadata). There is no second runtime to switch to.

Scope: applies to rule 19 only. Every other conformance rule must still pass. If this lab ever gains a UI, this waiver ends and rule 19 applies in full.
