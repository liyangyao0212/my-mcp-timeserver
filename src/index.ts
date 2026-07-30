import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

// ---- Day.js setup ----
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// ---- MCP Agent ----

export class MyMCP extends McpAgent {
  // core MCP server
  server = new McpServer({
    name: "time-mcp-remote",
    version: "1.0.0",
  });

  // called once when the MCP server starts up
  async init() {
    // current_time
    this.server.tool(
      "current_time",
      {
        format: z
          .enum([
            "h:mm A",
            "h:mm:ss A",
            "YYYY-MM-DD HH:mm:ss",
            "YYYY-MM-DD",
            "YYYY-MM",
            "MM/DD/YYYY",
            "MM/DD/YY",
            "YYYY/MM/DD",
            "YYYY/MM",
          ])
          .default("YYYY-MM-DD HH:mm:ss"),
        timezone: z
          .string()
          .describe("IANA timezone, e.g. Europe/Amsterdam")
          .optional(),
      },
      async ({ format, timezone }) => {
        const utcTime = dayjs.utc();

        let localTz: string;
        try {
          localTz = timezone ?? dayjs.tz.guess();
        } catch {
          localTz = timezone ?? "UTC";
        }

        const localTime = dayjs().tz(localTz);

        return {
          content: [
            {
              type: "text",
              text: `Current UTC time is ${utcTime.format(
                format
              )}, and the time in ${localTz} is ${localTime.format(format)}.`,
            },
          ],
        };
      }
    );

    // relative_time
    this.server.tool(
      "relative_time",
      {
        time: z
          .string()
          .describe("Time to compare with now. Format: YYYY-MM-DD HH:mm:ss"),
      },
      async ({ time }) => {
        const result = dayjs(time).fromNow();
        return {
          content: [{ type: "text", text: result }],
        };
      }
    );

    // days_in_month
    this.server.tool(
      "days_in_month",
      {
        date: z
          .string()
          .describe("Date to inspect (YYYY-MM-DD). If omitted, use current month.")
          .optional(),
      },
      async ({ date }) => {
        const days = date ? dayjs(date).daysInMonth() : dayjs().daysInMonth();
        return {
          content: [
            {
              type: "text",
              text: `The number of days in month is ${days}.`,
            },
          ],
        };
      }
    );

    // get_timestamp
    this.server.tool(
      "get_timestamp",
      {
        time: z
          .string()
          .describe("Time to get timestamp for, parsed as UTC (YYYY-MM-DD HH:mm:ss.SSS)")
          .optional(),
      },
      async ({ time }) => {
        const ts = time ? dayjs.utc(time).valueOf() : dayjs().valueOf();
        const text = time
          ? `The timestamp of ${time} (parsed as UTC) is ${ts} ms.`
          : `The current timestamp is ${ts} ms.`;
        return {
          content: [{ type: "text", text }],
        };
      }
    );

    // convert_time
    this.server.tool(
      "convert_time",
      {
        sourceTimezone: z
          .string()
          .describe("Source timezone (IANA), e.g. Europe/Amsterdam"),
        targetTimezone: z
          .string()
          .describe("Target timezone (IANA), e.g. Asia/Tokyo"),
        time: z
          .string()
          .describe("Date and time (24h). e.g. 2025-03-23 12:30:00"),
      },
      async ({ sourceTimezone, targetTimezone, time }) => {
        const sourceTime = dayjs.tz(time, sourceTimezone);
        const targetTime = sourceTime.tz(targetTimezone);
        const formatString = "YYYY-MM-DD HH:mm:ss";
        const diffHours = targetTime.diff(sourceTime, "hour");

        return {
          content: [
            {
              type: "text",
              text: `Current time in ${sourceTimezone} is ${sourceTime.format(
                formatString
              )}, and the time in ${targetTimezone} is ${targetTime.format(
                formatString
              )}. The time difference is ${diffHours} hours.`,
            },
          ],
        };
      }
    );

    // get_week_year
    this.server.tool(
      "get_week_year",
      {
        date: z
          .string()
          .describe("Date to use, e.g. 2025-03-23. If omitted, uses current date.")
          .optional(),
      },
      async ({ date }) => {
        const d = date ? dayjs(date) : dayjs();
        const week = d.week();
        const isoWeekNum = d.isoWeek();

        return {
          content: [
            {
              type: "text",
              text: `The week of the year is ${week}, and the isoWeek of the year is ${isoWeekNum}.`,
            },
          ],
        };
      }
    );
  }
}

// ---- Cloudflare Worker entrypoint ----
// This exposes your MCP server over SSE (/sse) and HTTP (/mcp),
// which matches the pattern from Cloudflare’s own examples. :contentReference[oaicite:1]{index=1}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // SSE transport (works with MCP Inspector + mcp-remote)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      // @ts-ignore: MyMCP is bound as a Durable Object via wrangler config
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // Streamable HTTP transport (2025 MCP standard)
    if (url.pathname.startsWith("/mcp")) {
      // @ts-ignore
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Optional health endpoint
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          name: "time-mcp-remote",
          version: "1.0.0",
          transports: { sse: "/sse", http: "/mcp" },
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};

