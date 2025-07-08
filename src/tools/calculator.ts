import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export const calculator = {
  name: 'calculator',
  description: 'Perform basic mathematical calculations',
  args: {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The mathematical operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number')
  },
  handle: async ({ operation, a, b }): Promise<CallToolResult> => {
    let result: number;
    let operationSymbol: string;

    switch (operation) {
      case 'add':
        result = a + b;
        operationSymbol = '+';
        break;
      case 'subtract':
        result = a - b;
        operationSymbol = '-';
        break;
      case 'multiply':
        result = a * b;
        operationSymbol = '×';
        break;
      case 'divide':
        if (b === 0) {
          throw new Error('Division by zero is not allowed');
        }
        result = a / b;
        operationSymbol = '÷';
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Calculation: ${a} ${operationSymbol} ${b} = ${result}`
        }
      ]
    };
  }
};
