import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { JSONRPCError, isInitializeRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
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
  args?: any;
  inputSchema?: any;
  outputSchema?: any;
  annotations?: any;
  async handle(args: any): Promise<CallToolResult> {
    throw new Error(`not implemented`);
  }
}

export class MCPServer {
  private options: MCPServerOptions;
  private _server: McpServer;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport };

  constructor(options?: MCPServerOptions) {
    if (!options?.name) throw new Error(`options.name is required`);

    this.options = options;
    this.transports = {};
    this._server = new McpServer(
      {
        name: options.name,
        version: options.version || '0.0.0'
      },
      {
        instructions: 'Use this server to calculate numbers.'
      }
    );
  }

  public get server(): McpServer {
    return this._server;
  }

  public addTool(tool: MCPTool): void {
    if (!tool) throw new Error(`argument tool is required`);
    if (!tool.name) throw new Error(`argument tool.name is required`);
    if (!tool.description) throw new Error(`argument tool.description is required`);
    if (!tool.handle) throw new Error(`argument tool.handle is required`);

    if (tool.args) {
      this.server.tool(tool.name, tool.description, tool.args, tool.handle);
    } else {
      this.server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
          annotations: tool.annotations
        },
        tool.handle
      );
    }
  }

  public async handleGet(req: Request, res: Response): Promise<void> {
    console.log(`GET request received: ${req.headers['mcp-session-id'] || '(empty session)'}`);

    try {
      const authorization = req.headers['authorization'] as string;
      const token = authorization?.split(' ')[1] || req.query.token;

      if (!this.options.token) {
        console.error('WARN: Environment variable TOKEN is required');
        res.status(401).json(this.createError('Unauthorized'));
        return;
      }

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

      if (!this.options.token) {
        console.error('WARN: Environment variable TOKEN is required');
        res.status(401).json(this.createError('Unauthorized'));
        return;
      }

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
        console.log(`Bad Request: no session ${sessionid}`);
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
