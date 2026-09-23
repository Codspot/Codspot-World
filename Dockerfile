# Codspot World in a container: Node + the Claude Code CLI. The repo, your Claude login and your project folders are
# mounted by docker-compose.yml at the same paths as on the host, so nothing in the config changes.
# Every start rebuilds the page from src/, so `docker compose restart` picks up a UI change.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates python3 && rm -rf /var/lib/apt/lists/* \
 && npm install -g @anthropic-ai/claude-code && npm cache clean --force
ENV HOME=/home/node AO_BROWSER=0
USER node
EXPOSE 4520
CMD ["sh", "-c", "[ -d node_modules ] || npm ci --no-fund --no-audit; node build.mjs && exec node serve.mjs"]
