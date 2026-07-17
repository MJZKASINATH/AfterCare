import { ExecutionContext } from '@nitrostack/core';

/**
 * Billing Prompts
 * 
 * TODO: Add description
 */
export class BillingPrompts {
  // TODO: Implement prompts
  async helpPrompt(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'TODO: Add prompt content',
        },
      },
    ];
  }
}
