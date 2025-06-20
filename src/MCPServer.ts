import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, JSONRPCError, isInitializeRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

export class MCPServerOptions {
  name?: string;
  version?: string;
  token: string;
}

export class MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  async toolCall(args: any): Promise<CallToolResult> {
    throw new Error(`not implemented`);
  }
}

export class MCPServer {
  private options: MCPServerOptions;
  private server: Server;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport };
  private tools: { [key: string]: MCPTool };

  constructor(options?: MCPServerOptions) {
    if (!options?.token) throw new Error(`options.token is required`);

    this.options = options;
    this.transports = {};
    this.tools = {};
    this.server = new Server(
      {
        name: options.name || 'mcp-server',
        version: options.version || '0.0.0'
      },
      {
        capabilities: {
          tools: {},
          logging: {}
        }
      }
    );

    // tools/list
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Object.keys(this.tools).map((name) => {
        const tool = this.tools[name];

        return {
          name,
          description: tool.description,
          inputSchema: tool.inputSchema
        };
      });

      console.log(
        'tools/list',
        tools.slice().map((tool) => tool.name)
      );

      return {
        tools
      };
    });

    // tools/call
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const toolName = request.params.name;
      const args = request.params.arguments;

      if (!toolName) throw new Error(`tool name is required`);
      if (!args) throw new Error(`tool call "${toolName}" args is required`);

      const tool = this.tools[toolName];
      if (!tool) throw new Error(`tool "${toolName}" not found`);

      return await tool.toolCall(args);
    });
  }

  public getServer(): Server {
    return this.server;
  }

  public addTool(tool: MCPTool): void {
    if (!tool) throw new Error(`argument tool is required`);
    if (!tool.name) throw new Error(`argument tool.name is required`);
    if (!tool.description) throw new Error(`argument tool.description is required`);
    if (!tool.inputSchema) throw new Error(`argument tool.inputSchema is required`);
    if (!tool.toolCall) throw new Error(`argument tool.toolCall is required`);

    this.tools[tool.name] = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      toolCall: tool.toolCall
    };
  }

  public async handleGet(req: Request, res: Response): Promise<void> {
    console.log(`GET request received: ${req.headers['mcp-session-id'] || '(empty session)'}`);

    try {
      const authorization = req.headers['authorization'] as string;
      const token = authorization?.split(' ')[1] || req.query.token;
      if (token !== this.options.token) {
        console.error('Invalid token', token);
        res.status(401).json(this.createError('Unauthorized'));
        return;
      }

      const sessionid = req.headers['mcp-session-id'] as string;
      if (!sessionid || !this.transports[sessionid]) {
        if (!sessionid) console.error(`Header "mcp-session-id" is required`);
        else console.error(`MCP Session "${sessionid}" not found`);

        res.status(400).json(this.createError('Bad Request'));
        return;
      }

      console.log(`MCP session established: ${sessionid}`);
      const transport = this.transports[sessionid];
      await transport.handleRequest(req, res);
    } catch (err) {
      res.status(500).json(this.createError(err.message));
    }
  }

  public async handlePost(req: Request, res: Response): Promise<void> {
    console.log('POST request received:', req.body);

    try {
      const authorization = req.headers['authorization'] as string;
      const token = authorization?.split(' ')[1] || req.query.token;
      if (token !== this.options.token) {
        console.error('Invalid token', token);
        res.status(401).json(this.createError('Unauthorized'));
        return;
      }

      const transports = this.transports;
      const sessionid = req.headers['mcp-session-id'] as string;
      const transport = transports[sessionid];

      if (transport) {
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!sessionid && isInitializeRequest(req.body)) {
        // create transport
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            console.log(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(`Transport closed for session ${sid}, removing from transports map`);
            delete transports[sid];
          }
        };

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        if (transport.sessionId) {
          this.transports[transport.sessionId] = transport;
        }
      } else {
        res.status(400).json(this.createError('Bad Request'));
      }
    } catch (err) {
      res.status(500).json(this.createError(err.message));
    }
  }

  public async handleDelete(req: Request, res: Response): Promise<void> {
    const transports = this.transports;
    const sessionId = req.headers['mcp-session-id'] as string;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    console.log(`Received session termination request for session ${sessionId}`);

    try {
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  }

  public async close() {
    const transports = this.transports;
    for (const sessionId in transports) {
      try {
        await transports[sessionId]?.close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }

    await this.server.close();
  }

  private createError(message: string, code?: number): JSONRPCError {
    return {
      jsonrpc: '2.0',
      error: {
        code: +code || -32603,
        message: message
      },
      id: randomUUID()
    };
  }
}
