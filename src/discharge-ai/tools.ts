/**
 * AfterCare Discharge AI - Core Tools
 * Five main tools for post-hospital recovery coordination
 */

import { Tool, z, ExecutionContext } from '@nitrostack/core';
import type {
  DischargeSummary,
  RecoveryTimeline,
  RecoveryDay,
  GroceryCart,
  CareServicePayload,
  SymptomEvaluation,
} from './schemas.js';
import {
  translateMedicalJargon,
  flagMissingCriticalData,
  filterGroceryItemsByRestrictions,
  evaluateSymptoms,
} from './safety.js';
import { SAMPLE_GROCERY_ITEMS } from './fixtures.js';

/**
 * Tool 1: Analyze Discharge Summary
 * Extracts diagnoses, medications, diets, activity restrictions, and follow-up schedules
 */
export const analyzeDischargeToolDef = new Tool({
  name: 'analyze_discharge_summary',
  description:
    'Extracts and translates medical information from a discharge summary into plain-language diagnoses, medications, dietary restrictions, activity guidelines, and follow-up appointments. Flags missing critical data.',
  inputSchema: z.object({
    discharge_text: z
      .string()
      .describe('Raw discharge summary text from hospital'),
    patient_name: z.string().optional().describe('Patient name'),
    discharge_date: z.string().optional().describe('Discharge date (YYYY-MM-DD)'),
  }),
  handler: async (
    input: { discharge_text: string; patient_name?: string; discharge_date?: string },
    context: ExecutionContext
  ): Promise<DischargeSummary> => {
    context.logger.info('Analyzing discharge summary');

    // Parse discharge text (simplified parsing for demo)
    const text = input.discharge_text.toLowerCase();

    // Extract diagnoses
    const diagnosisKeywords: Record<string, string> = {
      appendicitis: 'Appendix inflammation',
      'heart attack': 'Heart attack',
      stroke: 'Stroke',
      pneumonia: 'Lung infection',
      diabetes: 'Diabetes',
      hypertension: 'High blood pressure',
      'high cholesterol': 'High cholesterol',
      'irregular heartbeat': 'Irregular heartbeat',
    };

    const diagnoses: string[] = [];
    for (const [keyword, diagnosis] of Object.entries(diagnosisKeywords)) {
      if (text.includes(keyword)) {
        diagnoses.push(diagnosis);
      }
    }

    // Extract medications (simplified)
    const medicationKeywords: Record<string, { name: string; dosage: string; frequency: string }> = {
      amoxicillin: { name: 'Amoxicillin', dosage: '500mg', frequency: 'three times daily' },
      metformin: { name: 'Metformin', dosage: '1000mg', frequency: 'twice daily' },
      lisinopril: { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
      atorvastatin: { name: 'Atorvastatin', dosage: '20mg', frequency: 'once daily' },
      aspirin: { name: 'Aspirin', dosage: '81mg', frequency: 'once daily' },
      acetaminophen: { name: 'Acetaminophen', dosage: '500mg', frequency: 'every 6 hours as needed' },
    };

    const medications = [];
    for (const [keyword, med] of Object.entries(medicationKeywords)) {
      if (text.includes(keyword)) {
        medications.push({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          route: 'oral',
          reason: 'As prescribed',
        });
      }
    }

    // Extract dietary restrictions
    const dietaryKeywords: Record<string, string> = {
      'low sodium': 'low-sodium',
      'low-sodium': 'low-sodium',
      diabetic: 'diabetic',
      'gluten free': 'gluten-free',
      'low fat': 'low-fat',
      liquid: 'liquid-only',
    };

    const dietary_restrictions = [];
    for (const [keyword, restriction] of Object.entries(dietaryKeywords)) {
      if (text.includes(keyword)) {
        dietary_restrictions.push({
          type: restriction,
          reason: 'As recommended',
        });
      }
    }

    // Extract activity restrictions
    const activityKeywords: Record<string, string> = {
      'no lifting': 'No heavy lifting',
      'bed rest': 'Bed rest',
      'limited walking': 'Limited walking',
      'no driving': 'No driving',
      'no swimming': 'No swimming',
    };

    const activity_restrictions = [];
    for (const [keyword, restriction] of Object.entries(activityKeywords)) {
      if (text.includes(keyword)) {
        activity_restrictions.push({
          restriction,
          duration: '1-4 weeks',
          reason: 'Post-operative recovery',
        });
      }
    }

    // Extract follow-ups
    const follow_ups = [];
    if (text.includes('follow up') || text.includes('follow-up')) {
      follow_ups.push({
        provider_type: 'Primary Care',
        timing: '1-2 weeks',
        reason: 'Post-discharge follow-up',
      });
    }

    // Flag missing critical data
    const missing_data_flags = flagMissingCriticalData({
      allergies: undefined,
      kidney_function: undefined,
      liver_function: undefined,
      medications,
      dietary_restrictions,
    });

    const summary: DischargeSummary = {
      patient_name: input.patient_name,
      discharge_date: input.discharge_date || new Date().toISOString().split('T')[0],
      admission_reason: translateMedicalJargon(diagnoses[0] || 'Hospital admission'),
      diagnoses: diagnoses.map((d) => translateMedicalJargon(d)),
      medications,
      dietary_restrictions,
      activity_restrictions,
      follow_ups,
      missing_data_flags,
      raw_summary: input.discharge_text,
    };

    return summary;
  },
});

/**
 * Tool 2: Generate Recovery Timeline
 * Returns a patient-facing, day-by-day checklist covering meal guidelines, hydration, and medication schedules
 */
export const generateTimelineToolDef = new Tool({
  name: 'generate_recovery_timeline',
  description:
    'Creates a day-by-day recovery checklist with meal guidelines, hydration targets, medication schedules, activity guidelines, and warning signs to watch for.',
  inputSchema: z.object({
    discharge_summary: z
      .object({
        patient_name: z.string().optional(),
        diagnoses: z.array(z.string()),
        medications: z.array(
          z.object({
            name: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            instructions: z.string().optional(),
          })
        ),
        dietary_restrictions: z.array(z.object({ type: z.string() })),
        activity_restrictions: z.array(z.object({ restriction: z.string() })),
      })
      .describe('Discharge summary data'),
    total_days: z.number().int().min(1).max(90).default(14).describe('Number of days to plan'),
  }),
  handler: async (
    input: {
      discharge_summary: {
        patient_name?: string;
        diagnoses: string[];
        medications: Array<{ name: string; dosage: string; frequency: string; instructions?: string }>;
        dietary_restrictions: Array<{ type: string }>;
        activity_restrictions: Array<{ restriction: string }>;
      };
      total_days: number;
    },
    context: ExecutionContext
  ): Promise<RecoveryTimeline> => {
    context.logger.info(`Generating ${input.total_days}-day recovery timeline`);

    const days: RecoveryDay[] = [];
    const startDate = new Date();

    for (let dayNum = 1; dayNum <= input.total_days; dayNum++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + dayNum - 1);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Determine meal guidelines based on day and restrictions
      let meals = {
        breakfast: 'Soft toast with honey, herbal tea',
        lunch: 'Broth-based soup with soft vegetables',
        dinner: 'Grilled chicken with steamed carrots and rice',
        snacks: 'Yogurt, banana, or applesauce',
      };

      if (dayNum === 1) {
        meals = {
          breakfast: 'Clear broth or water',
          lunch: 'Clear broth or water',
          dinner: 'Clear broth or water',
          snacks: 'Ice chips or water',
        };
      } else if (dayNum <= 3) {
        meals = {
          breakfast: 'Clear broth, herbal tea',
          lunch: 'Clear broth with soft crackers',
          dinner: 'Clear broth with soft vegetables',
          snacks: 'Water, herbal tea',
        };
      }

      // Build medication schedule
      const medicationSchedule = input.discharge_summary.medications.map((med, idx) => {
        const times = ['8:00 AM', '2:00 PM', '8:00 PM'];
        return {
          time: times[idx % times.length],
          medication_name: med.name,
          dosage: med.dosage,
          instructions: med.instructions || 'Take as directed',
        };
      });

      // Activity guidelines
      const activityGuidelines: string[] = [];
      if (dayNum === 1) {
        activityGuidelines.push('Rest in bed; minimal movement');
        activityGuidelines.push('Use call button for assistance');
      } else if (dayNum <= 3) {
        activityGuidelines.push('Short walks around room with assistance');
        activityGuidelines.push('Sit up in chair for 30 minutes');
      } else if (dayNum <= 7) {
        activityGuidelines.push('Walk 5-10 minutes, 2-3 times daily');
        activityGuidelines.push('Gradually increase activity as tolerated');
      } else {
        activityGuidelines.push('Continue gradual activity increase');
        activityGuidelines.push('Avoid heavy lifting (over 5 lbs)');
      }

      // Warning signs
      const warningSignsBase = [
        'Fever above 101°F (38.3°C)',
        'Increased pain not relieved by medication',
        'Redness, warmth, or pus at incision',
        'Difficulty breathing',
        'Chest pain or pressure',
      ];

      const day: RecoveryDay = {
        day_number: dayNum,
        date: dateStr,
        title: `Day ${dayNum}: ${dayNum === 1 ? 'Initial Recovery' : dayNum <= 7 ? 'Early Recovery' : 'Progressive Recovery'}`,
        meals,
        hydration_target: dayNum === 1 ? '4-6 glasses of water' : '8-10 glasses of water',
        medications: medicationSchedule,
        activity_guidelines: activityGuidelines,
        warning_signs: warningSignsBase,
        notes:
          dayNum === 1
            ? 'Focus on rest and hydration. Pain is normal; use medication as prescribed.'
            : dayNum === 7
              ? 'You should be feeling significantly better. Continue following restrictions.'
              : undefined,
      };

      days.push(day);
    }

    const timeline: RecoveryTimeline = {
      patient_name: input.discharge_summary.patient_name,
      start_date: startDate.toISOString().split('T')[0],
      total_days: input.total_days,
      condition: translateMedicalJargon(input.discharge_summary.diagnoses[0] || 'recovery'),
      days,
      general_guidelines: [
        'Take all medications exactly as prescribed',
        'Follow dietary restrictions strictly',
        'Stay hydrated throughout the day',
        'Gradually increase activity as tolerated',
        'Keep all follow-up appointments',
        'Call your doctor if you have concerns',
      ],
      emergency_contacts: {
        after_hours_line: '(555) 999-0000',
      },
    };

    return timeline;
  },
});

/**
 * Tool 3: Build Grocery Cart
 * Generates a curated shopping list with strict filtering for dietary restrictions and drug interactions
 */
export const buildGroceryToolDef = new Tool({
  name: 'build_grocery_cart',
  description:
    'Creates a doctor-recommended grocery shopping list, filtering out foods that violate dietary restrictions or interact with medications.',
  inputSchema: z.object({
    dietary_restrictions: z
      .array(z.string())
      .describe('List of dietary restrictions (e.g., "low-sodium", "diabetic")'),
    medications: z
      .array(
        z.object({
          name: z.string(),
          dosage: z.string().optional(),
        })
      )
      .describe('List of prescribed medications'),
    patient_name: z.string().optional().describe('Patient name'),
  }),
  handler: async (
    input: {
      dietary_restrictions: string[];
      medications: Array<{ name: string; dosage?: string }>;
      patient_name?: string;
    },
    context: ExecutionContext
  ): Promise<GroceryCart> => {
    context.logger.info('Building grocery cart with safety filters');

    // Convert input to schema format
    const restrictions = input.dietary_restrictions.map((type) => ({ type }));
    const meds = input.medications.map((m) => ({
      name: m.name,
      dosage: m.dosage || 'unknown',
      frequency: 'as prescribed',
      route: 'oral',
    }));

    // Filter grocery items
    const safeItems = filterGroceryItemsByRestrictions(SAMPLE_GROCERY_ITEMS, restrictions, meds);

    // Calculate estimated total
    const estimatedTotal = safeItems.reduce((sum, item) => {
      return sum + (item.unit_price || 0);
    }, 0);

    const cart: GroceryCart = {
      patient_name: input.patient_name,
      dietary_restrictions: input.dietary_restrictions,
      medications_considered: input.medications.map((m) => m.name),
      items: safeItems,
      estimated_total: Math.round(estimatedTotal * 100) / 100,
      shopping_tips: [
        'Buy fresh produce; frozen is acceptable if fresh is unavailable',
        'Check expiration dates on all items',
        'Choose low-sodium versions of canned goods',
        'Ask pharmacist about any food-medication interactions',
        'Consider meal prep to save time during recovery',
      ],
      missing_data_warnings:
        input.dietary_restrictions.length === 0
          ? ['No dietary restrictions provided; confirm with patient']
          : undefined,
    };

    return cart;
  },
});

/**
 * Tool 4: Coordinate Care Services
 * Creates draft API payloads for pharmacy delivery and calendar scheduling
 */
export const coordinateServicesToolDef = new Tool({
  name: 'coordinate_care_services',
  description:
    'Generates API payloads for external integrations: pharmacy medication delivery orders and calendar invites for follow-up appointments.',
  inputSchema: z.object({
    service_type: z
      .enum(['pharmacy_delivery', 'calendar_scheduling', 'both'])
      .describe('Type of service to coordinate'),
    medications: z
      .array(
        z.object({
          name: z.string(),
          dosage: z.string(),
          quantity: z.number().int(),
          frequency: z.string(),
        })
      )
      .optional()
      .describe('Medications for pharmacy delivery'),
    follow_ups: z
      .array(
        z.object({
          provider_name: z.string().optional(),
          provider_type: z.string(),
          timing: z.string(),
          reason: z.string().optional(),
        })
      )
      .optional()
      .describe('Follow-up appointments for calendar'),
    patient_name: z.string().optional(),
    patient_email: z.string().optional(),
  }),
  handler: async (
    input: {
      service_type: 'pharmacy_delivery' | 'calendar_scheduling' | 'both';
      medications?: Array<{ name: string; dosage: string; quantity: number; frequency: string }>;
      follow_ups?: Array<{ provider_name?: string; provider_type: string; timing: string; reason?: string }>;
      patient_name?: string;
      patient_email?: string;
    },
    context: ExecutionContext
  ): Promise<CareServicePayload[]> => {
    context.logger.info(`Coordinating care services: ${input.service_type}`);

    const payloads: CareServicePayload[] = [];

    // Generate pharmacy delivery payload
    if (input.service_type === 'pharmacy_delivery' || input.service_type === 'both') {
      if (input.medications && input.medications.length > 0) {
        payloads.push({
          service_type: 'pharmacy_delivery',
          pharmacy_delivery: {
            order_id: `ORD-${Date.now()}`,
            patient_name: input.patient_name,
            medications: input.medications,
            delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            special_instructions: 'Deliver to patient home; signature required',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Generate calendar invite payloads
    if (input.service_type === 'calendar_scheduling' || input.service_type === 'both') {
      if (input.follow_ups && input.follow_ups.length > 0) {
        for (const followUp of input.follow_ups) {
          const appointmentDate = new Date();
          // Parse timing (e.g., "1 week", "2 weeks")
          const daysToAdd = parseInt(followUp.timing) * 7 || 7;
          appointmentDate.setDate(appointmentDate.getDate() + daysToAdd);

          const startTime = new Date(appointmentDate);
          startTime.setHours(10, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(11, 0, 0);

          payloads.push({
            service_type: 'calendar_scheduling',
            calendar_invite: {
              event_id: `EVT-${Date.now()}-${Math.random()}`,
              title: `Follow-up: ${followUp.provider_type}`,
              description: followUp.reason || 'Post-discharge follow-up appointment',
              start_datetime: startTime.toISOString(),
              end_datetime: endTime.toISOString(),
              provider_name: followUp.provider_name,
              patient_name: input.patient_name,
              patient_email: input.patient_email,
              reason: followUp.reason,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return payloads;
  },
});

/**
 * Tool 5: Evaluate Symptom Warning
 * Evaluates user-reported symptoms against red flags to determine if they should rest, call doctor, or go to ER
 */
export const evaluateSymptomToolDef = new Tool({
  name: 'evaluate_symptom_warning',
  description:
    'Evaluates reported symptoms against medical red flags to determine whether the patient should rest, call their doctor, or go to the emergency room.',
  inputSchema: z.object({
    symptoms: z.array(z.string()).describe('List of reported symptoms'),
    patient_name: z.string().optional(),
    baseline_vitals: z
      .object({
        temperature: z.number().optional(),
        heart_rate: z.number().optional(),
        blood_pressure: z.string().optional(),
      })
      .optional()
      .describe('Patient baseline vital signs for context'),
  }),
  handler: async (
    input: {
      symptoms: string[];
      patient_name?: string;
      baseline_vitals?: { temperature?: number; heart_rate?: number; blood_pressure?: string };
    },
    context: ExecutionContext
  ): Promise<SymptomEvaluation> => {
    context.logger.info(`Evaluating symptoms for patient: ${input.patient_name || 'unknown'}`);

    const evaluation = evaluateSymptoms(input.symptoms);

    const result: SymptomEvaluation = {
      reported_symptoms: input.symptoms,
      evaluation_timestamp: new Date().toISOString(),
      recommendation: evaluation.recommendation,
      reasoning: evaluation.reasoning,
      red_flags_detected: evaluation.red_flags_detected,
      suggested_actions:
        evaluation.recommendation === 'go_to_er'
          ? [
              'Call 911 or go to the nearest emergency room immediately',
              'Bring discharge papers and medication list',
              'Inform ER staff of recent hospitalization',
            ]
          : evaluation.recommendation === 'call_doctor'
            ? [
                'Call your doctor or nurse hotline',
                'Have your discharge papers and medication list ready',
                'Describe all symptoms and when they started',
                'Follow any instructions given by your healthcare provider',
              ]
            : [
                'Rest and stay hydrated',
                'Take prescribed medications as directed',
                'Monitor your symptoms',
                'Call your doctor if symptoms worsen or new symptoms develop',
              ],
      emergency_contact: '911',
      missing_data_warnings: !input.baseline_vitals
        ? ['Baseline vital signs not provided; symptom evaluation is general guidance only']
        : undefined,
    };

    return result;
  },
});
