# Talk track: MCP resource server LAB

Each `##` heading is one presenter step. This is a headless Tool-tier app — an MCP server, no UI — so this track is a demo over the wire: terminal and MCP Inspector steps with the curl to type and what to say.

## No UI, by design

Open with the shape of the thing: this is a config-driven MCP resource server — tools, data, resources and prompts come from `verticals/<name>/` config files, answered from a bundled SQLite database. No backend, no frontend; you demo it with an MCP client or curl.

## Show it is up

`curl -s http://localhost:8081/api/health` — the `demo-health/1` response. Then `curl -s http://localhost:8081/.well-known/oauth-protected-resource`: the server advertises itself, its scopes (`banking:read` by default, derived from the tool catalog) and its authorization server. Say that the metadata is generated, so it can never drift from the tools.

## Get a token

For a quick offline demo (`STRICT_AUTH=false` default), mint a hand-made JWT with the one-liner in the README: `sub`, `scope: banking:read`, `aud` matching the resource URI. Say the honesty line: without a JWKS source the signature is not checked; with `PINGONE_ISSUER` set, every token is verified against your PingOne environment's keys.

## Connect the MCP Inspector

Run `npx @modelcontextprotocol/inspector`, set Transport to Streamable HTTP, URL `http://localhost:8081/mcp`, and add the `Authorization: Bearer <token>` header before connecting. This is the most reliable client because it lets you set a manual header.

## List the tools

Call `tools/list`. The default banking vertical serves eight tools: `list_accounts`, `get_account`, `get_account_balance`, `list_transactions`, `search_transactions`, `list_cards`, `get_statement`, `find_branches`. Each definition carries its input schema and required scopes.

## Call one for real

`get_account_balance` with `account_id: ACC-001`. The seeded data has ACC-001 checking, ACC-002 savings, ACC-003 money market, ACC-004 credit card; statements for 2026-06 and 2026-07. Every answer comes from the local SQLite file.

## Show the 403 that proves scope enforcement

Call a tool with a token whose scope does not cover it. The refusal is the demo: `requiredScopes` in the tool config is enforced on every call, and the error says which scope was missing.

## Switch the vertical live

Stop, set `VERTICAL=healthcare`, `docker compose up --build` again. Same port, same auth, same endpoints — but `tools/list` now shows healthcare tools and the data is a different database. The whole point: the server is config, not code; a vertical is three files (`vertical.json`, `schema.sql`, `seed.json`).

## Wire a real MCP client

Show the static config for Claude Desktop / Cursor / Windsurf pointing at `http://localhost:8081/mcp`. Explain the difference: those clients carry no static token, so they read the protected-resource metadata, find your PingOne environment, and prompt a sign-in — which needs a PingOne-side OAuth client for that app.

## Reset

`docker compose down` — and that is the reset. The database is seeded at startup and never re-seeds a non-empty table, so edits made through tools stick across restarts; delete the `data/*.db` file to start clean.
