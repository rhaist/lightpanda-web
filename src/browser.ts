import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync } from "fs";
import { join } from "path";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

let client: Client | null = null;
let connecting: Promise<Client> | null = null;

function bundledBinPath(): string {
  const name = process.platform === "win32" ? "lightpanda.exe" : "lightpanda";
  for (const base of [__dirname, join(__dirname, "..")]) {
    const candidate = join(base, "bin", name);
    if (existsSync(candidate)) return candidate;
  }
  return join(__dirname, "bin", name);
}

export async function getClient(): Promise<Client> {
  if (client) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const bin = bundledBinPath();
    if (!existsSync(bin)) {
      throw new Error(
        `Lightpanda binary not found at ${bin}.\nRun \`npm install\` to download it.`
      );
    }

    const transport = new StdioClientTransport({
      command: bin,
      args: ["mcp"],
      env: {
        ...process.env,
        LIGHTPANDA_DISABLE_TELEMETRY: "true",
        // Ensure Lightpanda can locate its app data dir when spawned as a subprocess.
        HOME: process.env.HOME ?? join(__dirname, ".."),
        XDG_DATA_HOME: process.env.XDG_DATA_HOME ?? join(__dirname, "..", ".data"),
      },
    });

    const c = new Client({ name: "lightpanda-web", version: "1.0.0" });
    await c.connect(transport);
    transport.onclose = () => { client = null; connecting = null; };
    client = c;
    connecting = null;
    return c;
  })();

  return connecting;
}

export async function listTools(): Promise<McpTool[]> {
  const c = await getClient();
  const { tools } = await c.listTools();
  return tools as McpTool[];
}

export async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const c = await getClient();
  const result = await c.callTool({ name, arguments: args });

  // MCP content is an array of { type, text } blocks
  const blocks = result.content as Array<{ type: string; text?: string }>;
  return blocks
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!)
    .join("\n")
    .trim();
}
