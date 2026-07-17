import { Tool, z, ExecutionContext } from '@nitrostack/core';

/**
 * List invoices with optional filtering
 */
export const listInvoicesTool = new Tool({
  name: 'list_invoices',
  description: 'List invoices with optional filtering by status, customer ID, or date range',
  inputSchema: z.object({
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional().describe('Filter by invoice status'),
    customerId: z.string().optional().describe('Filter by customer ID'),
    limit: z.number().int().min(1).max(100).default(10).describe('Maximum number of invoices to return'),
    offset: z.number().int().min(0).default(0).describe('Number of invoices to skip'),
  }),
  handler: async (input: unknown, context: ExecutionContext) => {
    const params = input as {
      status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
      customerId?: string;
      limit: number;
      offset: number;
    };
    
    context.logger.info(`Listing invoices with filters: ${JSON.stringify(params)}`);
    
    // Mock invoice data
    const allInvoices = [
      {
        id: 'inv_001',
        customerId: 'cust_123',
        amount: 1500.00,
        status: 'paid',
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        description: 'Monthly service fee',
      },
      {
        id: 'inv_002',
        customerId: 'cust_456',
        amount: 2500.00,
        status: 'sent',
        issueDate: '2024-01-20',
        dueDate: '2024-02-20',
        description: 'Consulting services',
      },
      {
        id: 'inv_003',
        customerId: 'cust_123',
        amount: 800.00,
        status: 'overdue',
        issueDate: '2023-12-01',
        dueDate: '2024-01-01',
        description: 'Support package',
      },
      {
        id: 'inv_004',
        customerId: 'cust_789',
        amount: 3200.00,
        status: 'draft',
        issueDate: '2024-01-25',
        dueDate: '2024-02-25',
        description: 'Project delivery',
      },
      {
        id: 'inv_005',
        customerId: 'cust_456',
        amount: 1200.00,
        status: 'paid',
        issueDate: '2024-01-10',
        dueDate: '2024-02-10',
        description: 'Training session',
      },
    ];

    // Apply filters
    let filtered = allInvoices;

    if (params.status) {
      filtered = filtered.filter(inv => inv.status === params.status);
    }

    if (params.customerId) {
      filtered = filtered.filter(inv => inv.customerId === params.customerId);
    }

    // Apply pagination
    const total = filtered.length;
    const paginated = filtered.slice(params.offset, params.offset + params.limit);

    return {
      invoices: paginated,
      total,
      limit: params.limit,
      offset: params.offset,
      hasMore: params.offset + params.limit < total,
    };
  },
});
