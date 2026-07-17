import { createServer } from '@nitrostack/core';
import {
  analyzeDischargeToolDef,
  generateTimelineToolDef,
  buildGroceryToolDef,
  coordinateServicesToolDef,
  evaluateSymptomToolDef,
} from './discharge-ai/tools.js';

const server = createServer({
  name: 'AfterCare',
  version: '1.0.0',
  description: 'Caring after curing - Post-hospital recovery coordinator',
});

// Register discharge-ai tools
server.tool(analyzeDischargeToolDef);
server.tool(generateTimelineToolDef);
server.tool(buildGroceryToolDef);
server.tool(coordinateServicesToolDef);
server.tool(evaluateSymptomToolDef);

server.start().catch((error) => {
  const logger = console;
  logger.error('Failed to start server:', error);
  process.exit(1);
});
