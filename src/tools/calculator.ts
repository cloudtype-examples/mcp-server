import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export const calculator = {
  name: 'calculator',
  description: '간단한 계산 기능을 수행합니다. 결과값은 수행한 계산식과 계산 결과 입니다.',
  args: {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('수행항 수식 연산'),
    a: z.number().describe('첫번째 숫자'),
    b: z.number().describe('두번째 숫자')
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
          throw new Error('0으로 나눌 수 없습니다.');
        }
        result = a / b;
        operationSymbol = '÷';
        break;
      default:
        throw new Error(`지원하지 않는 연산: ${operation}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `${a} ${operationSymbol} ${b} = ${result}`
        }
      ]
    };
  }
};
