import express, { Request, Response } from 'express';
import { MCPServer } from './MCPServer.js';
import { calculator } from './tools/index.js';

const PORT = +process.env.PORT || 3000;
const TOKEN = process.env.TOKEN || 'dev-token';

const mcp = new MCPServer({
  token: TOKEN
});

mcp.addTool(calculator);

const app = express()
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
