# ⏱️ Time MCP Server on Cloudflare Workers (Remote, No Auth)

This project is a **remote MCP server** running on **Cloudflare Workers** that gives LLMs rich time awareness:

- Current time (UTC + any timezone)
- Relative time (“3 hours ago”, “in 2 days”)
- Days in month
- Timestamps
- Timezone conversion
- Week / ISO week of the year

It is based on Cloudflare’s `remote-mcp-authless` template, but exposes a full **time toolkit** over MCP.

---

## Tools

The server exposes these MCP tools:

- `current_time`  
  Get the current time in UTC and in a target timezone, in a configurable format.

- `relative_time`  
  Get the relative time from now for a given timestamp (e.g. `"2025-03-23 12:00:00"` → `"in 2 days"`).

- `days_in_month`  
  Get the number of days in a given month (or the current month if no date is provided).

- `get_timestamp`  
  Get the Unix timestamp (milliseconds) for a given time, or for **now**.

- `convert_time`  
  Convert a given time between two IANA timezones (e.g. `Europe/Amsterdam` → `Asia/Tokyo`).

- `get_week_year`  
  Get the week number and ISO week number for a given date, or for today.

All tools are implemented in `src/index.ts` using `this.server.tool(...)` on a `McpServer` instance.

---

## Get Started

You can either:

### 1. Deploy from this repo (once it’s on GitHub)

Use the **Deploy to Workers** button (update the URL to match your GitHub repo):

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/<your-github-username>/mcp-timeserver)

This will deploy your MCP server to a URL like:

    https://mcp-timeserver.<your-account>.workers.dev/sse

### 2. Create locally from the Cloudflare template

If you want to reproduce this setup from scratch:

    npm create cloudflare@latest -- mcp-timeserver --template=cloudflare/ai/demos/remote-mcp-authless

Then replace `src/index.ts` with the time MCP implementation from this repo and install `dayjs`:

    npm install dayjs

---

## Running Locally

From the project directory:

    npm install
    npm run start

This starts a local dev server, usually at:

    http://localhost:8787

Exposed endpoints:

- **SSE MCP transport**: `http://localhost:8787/sse`
- **HTTP (streamable) MCP transport**: `http://localhost:8787/mcp`
- **Health check**: `http://localhost:8787/health`

---

## Deploying to Cloudflare

To deploy the Worker:

    npx wrangler login
    npm run deploy
    # or
    npx wrangler deploy

After deploy you’ll get a URL like:

    https://mcp-timeserver.<your-account>.workers.dev

With MCP endpoints:

- SSE:  `https://mcp-timeserver.<your-account>.workers.dev/sse`
- HTTP: `https://mcp-timeserver.<your-account>.workers.dev/mcp`

---

## Using the MCP Server

### 1. Cloudflare AI Playground

You can use this Worker as a **remote MCP server** from the Cloudflare AI Playground:

1. Go to https://playground.ai.cloudflare.com/
2. Add a new MCP server and use your deployed URL, for example:

       https://mcp-timeserver.<your-account>.workers.dev/sse

3. The tools `current_time`, `relative_time`, etc. will be available for the model to call.

---

### 2. MCP Inspector (local testing)

To inspect tools and make test calls:

    npx @modelcontextprotocol/inspector@latest

In the Inspector UI:

- Use `http://localhost:8787/sse` (dev) or your deployed `/sse` URL.
- Connect and then **List Tools** to see all time tools.
- Call tools like `current_time` with JSON arguments, for example:

        {
          "format": "YYYY-MM-DD HH:mm:ss",
          "timezone": "Europe/Amsterdam"
        }

---

### 3. Connect Claude Desktop via `mcp-remote`

Most desktop clients still speak **stdio MCP**, so you can use `mcp-remote` as a proxy to your Cloudflare Worker.

In your Claude Desktop config (e.g. `claude_desktop_config.json`):

    {
      "mcpServers": {
        "time-mcp-timeserver": {
          "command": "npx",
          "args": [
            "mcp-remote",
            "https://mcp-timeserver.<your-account>.workers.dev/sse"
          ]
        }
      }
    }

Restart Claude. You should now see:

- `current_time`
- `relative_time`
- `days_in_month`
- `get_timestamp`
- `convert_time`
- `get_week_year`

available as tools.

---

## Development Notes

- **Runtime**: Cloudflare Workers + Durable Objects  
- **MCP**: `@modelcontextprotocol/sdk` via Cloudflare `agents/mcp`  
- **Time library**: `dayjs` with `utc`, `timezone`, `relativeTime`, `weekOfYear`, `isoWeek` plugins.
- **Entry point**: `src/index.ts`  
- **Config**: `wrangler.toml`

---

## License

MIT – feel free to fork, extend, and adapt.

