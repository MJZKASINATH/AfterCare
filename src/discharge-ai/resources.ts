/**
 * AfterCare Discharge AI - MCP Resources
 *
 * Verified against NitroStack Studio's real types:
 *
 *   ResourceDefinition.handler:
 *     (uri: string, context: ExecutionContext) => Promise<ResourceContent>
 *
 *   ResourceContent (types.d.ts):
 *     | { type: 'text';   data: string }
 *     | { type: 'binary'; data: Buffer }
 *     | { type: 'json';   data: JsonValue }
 *
 * All resources here return structured objects, so they use the 'json'
 * variant directly — no manual JSON.stringify needed, `data` takes the
 * object as-is.
 *
 * `data` is typed as `JsonValue`, a structural union — TypeScript won't
 * auto-widen named interfaces (DischargeSummary, RecoveryTimeline, etc.)
 * into it even though they're JSON-compatible at runtime, so each return
 * uses `as unknown as JsonValue` to satisfy the compiler.
 *
 * ⚠️ Assumed `JsonValue` is exported from '@nitrostack/core' alongside
 * `Resource`/`ExecutionContext`, since that's where ResourceContent (which
 * references it) is defined. If Studio errors on this import specifically
 * ("has no exported member 'JsonValue'"), it likely lives in schemas.ts or
 * a types.js/types.ts file instead — check where types.d.ts itself imports
 * JsonValue from and fix this one import line to match.
 *
 * The 5 real tools are analyze_discharge_summary, generate_recovery_timeline,
 * build_grocery_cart, coordinate_care_services, and evaluate_symptom_warning.
 */

import { Resource, z, ExecutionContext, type JsonValue } from '@nitrostack/core';
import type {
  DischargeSummary,
  RecoveryTimeline,
  RecoveryDay,
  GroceryCart,
  CareServicePayload,
  SymptomEvaluation,
} from './schemas.js';
import { resourceCache, CACHE_KEYS } from './resource-cache.js'; // same folder as tools.ts

/* ------------------------------------------------------------------------ */
/* 1. Discharge Summary Resource                                             */
/*    Backs: analyze_discharge_summary                                      */
/*    URI: discharge://summary/latest                                       */
/* ------------------------------------------------------------------------ */

export const dischargeSummaryResourceDef = new Resource({
  uri: 'discharge://summary/latest',
  name: 'discharge_summary',
  description:
    'Latest structured discharge summary: diagnoses, medications, dietary/activity restrictions, follow-ups, missing-data flags.',
  mimeType: 'application/json',
  handler: async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading discharge_summary resource');

    const data = resourceCache.get<DischargeSummary>(CACHE_KEYS.DISCHARGE_SUMMARY);

    return {
      type: 'json' as const,
      data: (data ?? {
        status: 'empty',
        message: 'No discharge summary has been generated yet. Run analyze_discharge_summary first.',
      }) as unknown as JsonValue,
    };
  },
});

/* ------------------------------------------------------------------------ */
/* 2. Recovery Timeline Resource                                             */
/*    Backs: generate_recovery_timeline                                     */
/*    URI: discharge://recovery-timeline/latest                             */
/* ------------------------------------------------------------------------ */

export const recoveryTimelineResourceDef = new Resource({
  uri: 'discharge://recovery-timeline/latest',
  name: 'recovery_timeline',
  description:
    'Latest day-by-day recovery timeline: meals, hydration, medication times, activity guidelines, warning signs.',
  mimeType: 'application/json',
  handler: async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading recovery_timeline resource');

    const data = resourceCache.get<RecoveryTimeline>(CACHE_KEYS.RECOVERY_TIMELINE);

    return {
      type: 'json' as const,
      data: (data ?? {
        status: 'empty',
        message: 'No recovery timeline has been generated yet. Run generate_recovery_timeline first.',
      }) as unknown as JsonValue,
    };
  },
});

/* ------------------------------------------------------------------------ */
/* 3. Medication Schedule Resource (derived view)                            */
/*    Backs: generate_recovery_timeline (medications live inside             */
/*    RecoveryTimeline.days[].medications — there is no separate tool)       */
/*    URIs: discharge://medication-schedule/latest                          */
/*          discharge://medication-schedule/slots (static)                  */
/* ------------------------------------------------------------------------ */

const ADMINISTRATION_SLOTS = [
  { id: 'morning', label: 'Morning', typicalWindow: '06:00–10:00' },
  { id: 'afternoon', label: 'Afternoon', typicalWindow: '12:00–15:00' },
  { id: 'evening', label: 'Evening', typicalWindow: '17:00–19:00' },
  { id: 'night', label: 'Night', typicalWindow: '20:00–23:00' },
] as const;

interface MedicationScheduleDay {
  day_number: number;
  date?: string;
  medications: RecoveryDay['medications'];
}

export const medicationScheduleResourceDef = new Resource({
  uri: 'discharge://medication-schedule/latest',
  name: 'medication_schedule_latest',
  description: 'Latest medication schedule, derived from the recovery timeline and grouped by day.',
  mimeType: 'application/json',
  handler: async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading medication_schedule_latest resource');

    const timeline = resourceCache.get<RecoveryTimeline>(CACHE_KEYS.RECOVERY_TIMELINE);
    const derived: MedicationScheduleDay[] | undefined = timeline?.days.map((day) => ({
      day_number: day.day_number,
      date: day.date,
      medications: day.medications,
    }));

    return {
      type: 'json' as const,
      data: (derived ?? {
        status: 'empty',
        message: 'No medication schedule available yet. Run generate_recovery_timeline first.',
      }) as unknown as JsonValue,
    };
  },
});

export const medicationScheduleSlotsResourceDef = new Resource({
  uri: 'discharge://medication-schedule/slots',
  name: 'medication_schedule_slots',
  description: 'Static reference list of administration time slots used to bucket medications.',
  mimeType: 'application/json',
  handler: async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading medication_schedule_slots resource');

    return {
      type: 'json' as const,
      data: ADMINISTRATION_SLOTS as unknown as JsonValue,
    };
  },
});

/* ------------------------------------------------------------------------ */
/* 4. Grocery Cart Resource                                                  */
/*    Backs: build_grocery_cart                                             */
/*    URI: discharge://grocery-cart/latest                                  */
/* ------------------------------------------------------------------------ */

export const groceryCartResourceDef = new Resource({
  uri: 'discharge://grocery-cart/latest',
  name: 'grocery_cart',
  description: 'Latest compliant grocery shopping list: items, quantities, safety flags, interaction warnings.',
  mimeType: 'application/json',
  handler: async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading grocery_cart resource');

    const data = resourceCache.get<GroceryCart>(CACHE_KEYS.GROCERY_CART);

    return {
      type: 'json' as const,
      data: (data ?? {
        status: 'empty',
        message: 'No grocery cart has been generated yet. Run build_grocery_cart first.',
      }) as unknown as JsonValue,
    };
  },
});

/* ------------------------------------------------------------------------ */
/* 5. Care Service Payloads Resource                                         */
/*    Backs: coordinate_care_services                                       */
/*    URI: discharge://care-services/latest                                 */
/* ------------------------------------------------------------------------ */

export const careServicesResourceDef = new Resource({
  uri: 'discharge://care-services/latest',
  name: 'care_service_payloads',
  description:
    'Latest generated pharmacy delivery and/or calendar invite payloads from care service coordination.',
  mimeType: 'application/json',
  handler: async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading care_service_payloads resource');

    const data = resourceCache.get<CareServicePayload[]>(CACHE_KEYS.CARE_SERVICE_PAYLOADS);

    return {
      type: 'json' as const,
      data: (data ?? {
        status: 'empty',
        message: 'No care service payloads have been generated yet. Run coordinate_care_services first.',
      }) as unknown as JsonValue,
    };
  },
});

/* ------------------------------------------------------------------------ */
/* 6. Symptom Evaluation Resource                                            */
/*    Backs: evaluate_symptom_warning                                       */
/*    URI: discharge://symptom-evaluation/latest                            */
/* ------------------------------------------------------------------------ */

export const symptomEvaluationResourceDef = new Resource({
  uri: 'discharge://symptom-evaluation/latest',
  name: 'symptom_evaluation',
  description: 'Latest symptom triage result: recommendation, red flags detected, and suggested actions.',
  mimeType: 'application/json',
  handler: async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading symptom_evaluation resource');

    const data = resourceCache.get<SymptomEvaluation>(CACHE_KEYS.SYMPTOM_EVALUATION);

    return {
      type: 'json' as const,
      data: (data ?? {
        status: 'empty',
        message: 'No symptom evaluation has been generated yet. Run evaluate_symptom_warning first.',
      }) as unknown as JsonValue,
    };
  },
});