# SyncFM Discord App

A Discord user-installable app that converts music links (Spotify, Apple Music, YouTube Music) to SyncFM universal links via message context menus or the `/share` slash command.

## stuffs

### Register Commands

Before running the bot, register the commands:

```bash
bun run register
```

To list registered commands:

```bash
bun run list-commands
```

To clear all commands:

```bash
bun run clear-commands
```

### Using the Commands

- **Convert to SyncFM (context menu)** — Right-click any message containing a supported music URL and choose “Convert to SyncFM” to post the converted embed.
- **/share** — Run `/share` with a supported URL to instantly post the converted SyncFM embed to the current channel.

### Running the Bot

Start the bot:

```bash
bun run start
```

For development with auto-reload:

```bash
bun run dev
```

The bot will connect to Discord's Gateway and listen for interactions.

### Analytics (optional)

To enable PostHog analytics for conversion events, set the following environment variables:

```env
POSTHOG_API_KEY=phc_your_project_api_key
# Optional overrides
POSTHOG_HOST=https://app.posthog.com
POSTHOG_DISABLED=false
POSTHOG_FLUSH_AT=1
POSTHOG_FLUSH_INTERVAL_MS=1000
```

Leave `POSTHOG_API_KEY` unset (or set `POSTHOG_DISABLED=true`) to disable analytics entirely.

## Docker Deployment

Build the Docker image:

```bash
docker build -t syncfm-discord .
```

Run the container:

```bash
docker run -d \
  -e DISCORD_BOT_TOKEN=your_bot_token \
  -e DISCORD_CLIENT_ID=1429085779367428219 \
   -e DISCORD_ENABLE_YOUTUBE=false \
   # Optional PostHog analytics configuration
   -e POSTHOG_API_KEY=phc_your_project_api_key \
   -e POSTHOG_HOST=https://app.posthog.com \
   -e POSTHOG_DISABLED=false \
  --name syncfm-discord \
  syncfm-discord
```

Or use docker-compose:

```bash
docker compose up -d --build
```

For subsequent restarts without rebuilding, drop `--build`.

## License

MIT
