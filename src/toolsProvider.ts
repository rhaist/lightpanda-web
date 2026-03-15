import { tool, type Tool, type ToolsProviderController } from "@lmstudio/sdk";
import { z } from "zod";
import { listTools, callTool, type McpTool } from "./browser";

export async function toolsProvider(_ctl: ToolsProviderController): Promise<Tool[]> {
  let mcpTools;
  try {
    mcpTools = await listTools();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Surface the setup error as a tool so the model can report it to the user.
    return [
      tool({
        name: "lightpanda_unavailable",
        description: `Lightpanda is not available: ${message}`,
        parameters: {},
        implementation: async () => `Lightpanda setup error: ${message}`,
      }),
    ];
  }
  return mcpTools.map((mcp) => buildTool(mcp));
}

function buildTool(mcp: McpTool): Tool {
  const parameters = buildZodParams(mcp);

  return tool({
    name: mcp.name,
    description: mcp.description,
    parameters,
    implementation: async (args) => {
      try {
        const result = await callTool(mcp.name, args as Record<string, unknown>);
        return result.length > 8000 ? result.slice(0, 8000) + "\n\n[truncated]" : result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `[${mcp.name}] Error: ${message}`;
      }
    },
  });
}

function buildZodParams(mcp: McpTool): Record<string, z.ZodTypeAny> {
  const props = mcp.inputSchema?.properties ?? {};
  const required = new Set(mcp.inputSchema?.required ?? []);
  const params: Record<string, z.ZodTypeAny> = {};

  for (const [key, schema] of Object.entries(props)) {
    let zodType = jsonSchemaTypeToZod(schema.type);
    if (schema.description) zodType = zodType.describe(schema.description);
    params[key] = required.has(key) ? zodType : zodType.optional();
  }

  return params;
}

function jsonSchemaTypeToZod(type: string): z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodUnknown {
  switch (type) {
    case "string":  return z.string();
    case "number":  return z.number();
    case "integer": return z.number().int();
    case "boolean": return z.boolean();
    default:        return z.unknown();
  }
}
