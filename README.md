# lightpanda-web

An [LM Studio](https://lmstudio.ai) plugin that gives models the ability to browse the web using [Lightpanda](https://github.com/lightpanda-io/browser) — a headless browser built for AI agents that uses 9× less memory and runs 11× faster than Chrome.

## Tools

The plugin exposes Lightpanda's built-in MCP tools directly:

| Tool | Description |
|---|---|
| `goto` | Navigate to a URL and load the page |
| `markdown` | Get page content as Markdown |
| `links` | Extract all links from the current page |
| `evaluate` | Run JavaScript in the page context |
| `semantic_tree` | Get a simplified semantic DOM tree |
| `interactiveElements` | Extract buttons, inputs, and other interactive elements |
| `structuredData` | Extract JSON-LD, OpenGraph, and other structured metadata |

Most tools accept an optional `url` parameter — if provided, they navigate there first, then perform the operation in a single step.

## Requirements

- LM Studio 0.3.x or later
- Linux (x86_64 or aarch64) or macOS (x86_64 or aarch64)
- Windows is not yet supported (no Lightpanda binary available)

## Installation

Install from the LM Studio Hub, or clone and load locally:

```bash
git clone https://github.com/rha/lightpanda-web
cd lightpanda-web
npm install   # downloads the Lightpanda binary for your platform (~60–115 MB)
lms dev       # load in LM Studio with hot-reload
```

The Lightpanda binary is downloaded automatically during `npm install`. No separate installation is needed.

## Usage

Enable the plugin in a chat session, then ask the model to browse the web naturally:

> "What does the Lightpanda homepage say about performance?"

> "Summarise the top stories on Hacker News right now."

> "Find all the links on https://example.com"

The model will call the appropriate tools automatically.

## Configuration

The Lightpanda binary path is resolved automatically. If you need to override it, set `LIGHTPANDA_ENDPOINT` before starting LM Studio (advanced use only).

## Development

```bash
npm install       # install dependencies and download binary
npm run build     # compile TypeScript
lms dev           # run with hot-reload
lms push          # publish to LM Studio Hub (bump manifest.json revision first)
```

## How it works

On first tool use, the plugin spawns `lightpanda mcp` as a subprocess and connects to it over stdio using the [Model Context Protocol](https://modelcontextprotocol.io). The MCP connection is reused across tool calls and automatically reconnects if the process exits. Tool definitions are read directly from Lightpanda at startup, so the plugin benefits from any new tools added in future Lightpanda releases without needing an update.

## License

ISC
