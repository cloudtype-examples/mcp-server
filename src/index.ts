import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { MCPServer } from './MCPServer.js';
import { calculator, userStatistics, userList } from './tools/index.js';

const PORT = +process.env.PORT || 3000;
const TOKEN = process.env.TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

if (!TOKEN) {
  console.warn(`WARN: Environment variable 'TOKEN' is required`);
}

const mcp = new MCPServer({
  name: 'my-mcp-server',
  token: TOKEN
});

mcp.server.tool(calculator.name, calculator.description, calculator.args, calculator.handle);
mcp.server.tool(userStatistics.name, userStatistics.description, userStatistics.args, userStatistics.handle);
mcp.server.tool(userList.name, userList.description, userList.args, userList.handle);

const app = express()
  .use(
    cors({
      origin: ALLOWED_ORIGIN || '*',
      methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'MCP-Session-Id', 'mcp-session-id']
    })
  )
  .use(express.json())
  .get('/mcp', async (req: Request, res: Response) => {
    await mcp.handleGet(req, res);
  })
  .post('/mcp', async (req: Request, res: Response) => {
    await mcp.handlePost(req, res);
  })
  .delete('/mcp', async (req: Request, res: Response) => {
    await mcp.handleDelete(req, res);
  });

app.listen(PORT, () => {
  console.log(`MCP Server listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await mcp.close();
  process.exit(0);
});
