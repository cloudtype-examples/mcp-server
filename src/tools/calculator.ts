import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const calculator = {
  name: 'calculator',
  description: 'Perform basic mathematical calculations',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The mathematical operation to perform'
      },
      a: {
        type: 'number',
        description: 'First number'
      },
      b: {
        type: 'number',
        description: 'Second number'
      }
    },
    required: ['operation', 'a', 'b']
  },
  toolCall: async (args: any): Promise<CallToolResult> => {
    const { operation, a, b } = args as {
      operation: 'add' | 'subtract' | 'multiply' | 'divide';
      a: number;
      b: number;
    };

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
