# CLAUDE.md: MCP resource server LAB

Tier: Tool. A config-driven MCP resource server: tools, data, resources and prompts come from `verticals/<name>/{vertical.json,schema.sql,seed.json}`, answered from a bundled SQLite database. Repo: https://github.com/ping-sandbox/mcp-resource-server-LAB. Read `README.md` first; the rulebook is `~/Development/STANDALONE-RULES.md` (skill `standalone-demo`).

## Run and test
- Needs Node 26 or newer. `npm ci`, `npm run build`, `npm run doctor`, `npm start` (binds `127.0.0.1:8081`). Docker: `docker compose up --build -d` publishes `127.0.0.1:${HOST_PORT:-8081}` only.
- `npm test` = jest (all verticals' tools, HTTP MCP, helm render) plus `node --test` for the forbidden-strings gate, the doctor and the compose file. `npm run typecheck`. Run suites on the Air (`air-test`), not on this Mac.
- `GET /api/health` answers `demo-health/1` for the shelf; `GET /health` is the older status.

## Rules that bite
- Loopback by default: `HOST` defaults to `127.0.0.1`. Only the Docker image sets `HOST=0.0.0.0`, and compose publishes on 127.0.0.1. Do not widen either.
- No real tenant is needed. A PingOne environment is optional (`.env.example`); never commit `.env`, never print a setting's value, no identifiers from other projects.
- The forbidden-strings gate (`npm run check:forbidden`, CI job `forbidden-strings`, secret `FORBIDDEN_STRINGS`) fails on a string from the owner's list, an unlisted UUID in docs or an unlisted private hostname. Counts only are printed.
- CI is GitHub-hosted (ubuntu-latest), Node 26 only: build, forbidden-strings, gitleaks. No self-hosted runners, no image publishing from this repo.
- Docker is OrbStack, never Docker Desktop. The SE k8s mock build is deferred; the Helm chart stays as documentation.
- Commits end with the Co-Authored-By line from the session's attribution reminder.

## Shelf
`docs/shelf-entry.json` registers this app (tag `mcp-server-built`). Run `scripts/check-drift.sh <this clone>` from the AI-DEMO-Standalone parent before a PR.
