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
import { resourceCache, CACHE_KEYS } from './resource-cache.js';

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
     admission_reason:
  `${translateMedicalJargon(diagnoses[0] || 'Hospital admission')}. We've carefully reviewed your discharge information and organized everything into a simple recovery plan to help you feel more confident and supported during your recovery journey.`,
      diagnoses: diagnoses.map((d) => translateMedicalJargon(d)),
      medications,
      dietary_restrictions,
      activity_restrictions,
      follow_ups,
      missing_data_flags,
      raw_summary: input.discharge_text,
    };

    // Update resource cache
    resourceCache.set(CACHE_KEYS.DISCHARGE_SUMMARY, summary);

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
    ? 'Welcome home. Today is all about giving your body the rest it deserves. Stay hydrated, take your medications on time, and remember that healing takes time. Every small step you take today is part of your recovery.'
    : dayNum === 7
      ? "You're making encouraging progress. Continue following your recovery plan, stay patient with yourself, and keep up these healthy habits. Consistency is one of the most important parts of healing."
      : undefined,
      };

      days.push(day);
    }

    const timeline: RecoveryTimeline = {
      start_date: startDate.toISOString().split('T')[0],
      total_days: input.total_days,
      condition: translateMedicalJargon(input.discharge_summary.diagnoses[0] || 'recovery'),
      days,
     general_guidelines: [
  'Take your medications exactly as prescribed to support a safe and steady recovery.',
  'Follow your recommended diet to help your body heal more effectively.',
  'Drink enough water throughout the day unless your healthcare provider has advised otherwise.',
  'Increase your daily activities gradually and listen to your body whenever it needs rest.',
  'Attend all follow-up appointments so your healthcare team can monitor your progress.',
  "If something worries you or feels unusual, don't hesitate to contact your healthcare provider. Your wellbeing always comes first.",
],
      emergency_contacts: {
        after_hours_line: '(555) 999-0000',
      },
    };

    // Update resource cache
    resourceCache.set(CACHE_KEYS.RECOVERY_TIMELINE, timeline);

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
      .union([
        z.array(z.string()),
        z.string(),
      ])
      .transform((val) => {
        if (Array.isArray(val)) return val;
        try {
          return JSON.parse(val);
        } catch {
          return [val];
        }
      })
      .describe('List of dietary restrictions (e.g., "low-sodium", "diabetic")'),
    medications: z
      .union([
        z.array(
          z.object({
            name: z.string(),
            dosage: z.string().optional(),
          })
        ),
        z.string(),
      ])
      .transform((val) => {
        if (Array.isArray(val)) return val;
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      })
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
    const restrictionObjects = input.dietary_restrictions.map((type) => ({ type }));
    const medObjects = input.medications.map((m) => ({
      name: m.name,
      dosage: m.dosage || 'unknown',
      frequency: 'as prescribed',
      route: 'oral',
    }));

    // Filter grocery items
    const safeItems = filterGroceryItemsByRestrictions(SAMPLE_GROCERY_ITEMS, restrictionObjects, medObjects);

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
  'These groceries have been selected to help support your recovery and overall wellbeing.',
  'Fresh ingredients are ideal, but frozen alternatives are perfectly fine when needed.',
  'Check expiry dates to ensure your meals remain fresh and safe.',
  "If you're unsure whether any food interacts with your medication, don't hesitate to ask your pharmacist.",
  'Preparing meals in advance can make your recovery easier and allow you to focus more on resting and healing.',
],
      missing_data_warnings:
        input.dietary_restrictions.length === 0
          ? ['No dietary restrictions were available. Please confirm them with your healthcare provider so we can recommend the safest foods for your recovery.']
          : undefined,
    };

    // Update resource cache
    resourceCache.set(CACHE_KEYS.GROCERY_CART, cart);

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
            special_instructions:
  "Please deliver the medications safely to the patient’s home and obtain a signature upon delivery to ensure everything reaches them securely.",
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
              description:
  followUp.reason ||
  'This follow-up appointment is an important part of your recovery journey, helping your healthcare provider monitor your progress and support your continued healing.',
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

    // Update resource cache
    resourceCache.set(CACHE_KEYS.CARE_SERVICE_PAYLOADS, payloads);

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
     reasoning:
  `${evaluation.reasoning} This guidance is intended to help you make informed decisions about your recovery, but if you're ever unsure or feel your condition is worsening, please contact your healthcare provider immediately.`,
      red_flags_detected: evaluation.red_flags_detected,
      suggested_actions:
        evaluation.recommendation === 'go_to_er'
          ? [
              'Your symptoms may require urgent medical attention. Please go to the nearest emergency department or call emergency services immediately.',
'If possible, ask a trusted family member or caregiver to accompany you.',
'Bring your discharge papers and medication list to help the medical team understand your recent treatment.',
            ]
          : evaluation.recommendation === 'call_doctor'
            ? [
               'Your symptoms should be discussed with your healthcare provider as soon as possible.',
'Keep your discharge summary and medication list nearby when you call.',
'Describe your symptoms clearly, including when they started and whether they have changed.',
'Carefully follow the advice provided by your healthcare team, and seek immediate care if your symptoms suddenly become worse.',
              ]
            : [
                'Continue getting plenty of rest and stay well hydrated to support your recovery.',
'Take all prescribed medications exactly as directed by your healthcare provider.',
'Keep monitoring your symptoms and pay attention to any noticeable changes.',
'If your symptoms worsen, new symptoms develop, or you feel concerned at any point, please contact your healthcare provider promptly.',
              ],
      emergency_contact: '911',
      missing_data_warnings: !input.baseline_vitals
        ? ['Baseline vital signs were not available, so this assessment is based only on your reported symptoms. If you have any concerns or notice changes in your condition, please consult your healthcare provider.']
        : undefined,
    };

    // Update resource cache
    resourceCache.set(CACHE_KEYS.SYMPTOM_EVALUATION, result);

    return result;
  },
});
