import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

import { TOOLS, HANDLERS } from './tools/index.js';

// Logging utility (you can replace with your preferred logging method)
function log(message: string, ...args: any[]) {
  console.error(`[Okta MCP Server] ${message}`, ...args);
}

// Server implementation
export async function startServer() {
  try {
    log('Initializing Okta MCP server...');

    // Log environment information
    log(`Node.js version: ${process.version}`);
    log(`Process ID: ${process.pid}`);
    log(`Platform: ${process.platform} (${process.arch})`);

    // Create server instance
    const server = new Server(
      { name: 'okta', version: '1.0.0' }, 
      { capabilities: { tools: {} } }
    );

    // Handle list tools request
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('Received list tools request');
      return { tools: TOOLS };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      log(`Received tool call: ${toolName}`);

      try {
        if (!(toolName in HANDLERS)) {
          throw new Error(`Unknown tool: ${toolName}`);
        }

        // Execute handler
        log(`Executing handler for tool: ${toolName}`);
        const result = await HANDLERS[toolName as keyof typeof HANDLERS]({ parameters: request.params.arguments || {} });
        log(`Handler execution completed for: ${toolName}`);

        return result;
      } catch (error) {
        log(`Error handling tool call: ${error instanceof Error ? error.message : String(error)}`);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Connect to transport
    log('Creating stdio transport...');
    const transport = new StdioServerTransport();

    // Connection with timeout
    log('Connecting server to transport...');
    try {
      await Promise.race([
        server.connect(transport),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        ),
      ]);

      const logMsg = 'Server started and running successfully';
      log(logMsg);

      return server;
    } catch (connectError) {
      log(
        `Transport connection error: ${
          connectError instanceof Error ? connectError.message : String(connectError)
        }`
      );
      if (connectError instanceof Error && connectError.message === 'Connection timeout') {
        log(
          'Connection to transport timed out. This might indicate an issue with the stdio transport.'
        );
      }
      throw connectError;
    }
  } catch (error) {
    log('Error starting server:', error);
    throw error;
  }
}

// Main entry point
async function main() {
  try {
    await startServer();
  } catch (error) {
    log(
      'Fatal error:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main().catch((error) => {
  log(
    'Unhandled error:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});