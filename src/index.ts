import { createServer } from '@nitrostack/core';
import {
  analyzeDischargeToolDef,
  generateTimelineToolDef,
  buildGroceryToolDef,
  coordinateServicesToolDef,
  evaluateSymptomToolDef,
} from './discharge-ai/tools.js';
import {
  dischargeSummaryResourceDef,
  recoveryTimelineResourceDef,
  medicationScheduleResourceDef,
  medicationScheduleSlotsResourceDef,
  groceryCartResourceDef,
  careServicesResourceDef,
  symptomEvaluationResourceDef,
} from './discharge-ai/resources.js';

import process from 'process';
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

// Register discharge-ai resources
server.resource(dischargeSummaryResourceDef);
server.resource(recoveryTimelineResourceDef);
server.resource(medicationScheduleResourceDef);
server.resource(medicationScheduleSlotsResourceDef);
server.resource(groceryCartResourceDef);
server.resource(careServicesResourceDef);
server.resource(symptomEvaluationResourceDef);

server.start().catch((error) => {
  const logger = console;
  logger.error('Failed to start server:', error);
  process.exit(1);
});
