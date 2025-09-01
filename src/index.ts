// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import OpenAI from "openai";

// Create the server
const server = new McpServer({
  name: "perplexity-mcp",
  version: "1.0.0",
});

// Initialize Perplexity client
const getPerplexityClient = () => {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is required");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.perplexity.ai"
  });
};

// Register Perplexity search tool
server.registerTool(
  "perplexity_search",
  {
    title: "Perplexity Search",
    description: "Search the web using Perplexity AI",
    inputSchema: {
      query: z.string().describe("The search query"),
      model: z.string()
        .optional()
        .default("sonar")
        .describe("Perplexity model to use (sonar, sonar-pro, sonar-reasoning)")
    },
  },
  async ({ query, model = "sonar" }) => {
    try {
      const client = getPerplexityClient();

      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: query }]
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error("No response received from Perplexity API");
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
