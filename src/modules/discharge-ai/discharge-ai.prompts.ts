import { ExecutionContext } from '@nitrostack/core';

/**
 * AfterCare MCP Prompts
 * 
 * Reusable prompt templates for common post-hospital recovery scenarios.
 * These prompts guide the model to use the right tools in the right order.
 */

export const AFTERCARE_PROMPTS = {
  /**
   * Prompt 1: Complete Recovery Setup
   * Guides the model to analyze discharge, create timeline, build grocery list, and coordinate services
   */
  completeRecoverySetup: {
    name: 'complete-recovery-setup',
    description:
      'Complete post-discharge setup: analyze discharge summary, create recovery timeline, build grocery list, and coordinate care services (pharmacy delivery + appointments)',
    arguments: {
      discharge_text: 'Raw discharge summary text from hospital',
    },
    template: (args: Record<string, unknown>) => `You are an AfterCare recovery coordinator. Help me set up my complete post-hospital recovery plan.

Here's my discharge summary:
${args.discharge_text || '[Discharge text will be provided by user]'}

Please:
1. Analyze my discharge summary to extract diagnoses, medications, dietary restrictions, and follow-ups
2. Create a 14-day recovery timeline with daily meal plans, medication schedules, and activity guidelines
3. Build a safe grocery shopping list based on my dietary restrictions and medications
4. Coordinate pharmacy delivery for my medications and schedule my follow-up appointments

Provide a comprehensive recovery plan that I can follow step-by-step.`,
  },

  /**
   * Prompt 2: Quick Symptom Check
   * Guides the model to evaluate symptoms and provide emergency guidance
   */
  quickSymptomCheck: {
    name: 'quick-symptom-check',
    description:
      'Quick symptom evaluation: assess reported symptoms and provide clear guidance (rest, call doctor, or go to ER)',
    arguments: {
      symptoms: 'List of reported symptoms',
      baseline_vitals: 'Optional baseline vital signs',
    },
    template: (args: Record<string, unknown>) => `I'm experiencing some symptoms after my recent hospitalization and I'm not sure if I should be concerned.

My symptoms are:
${args.symptoms || '[Symptoms will be provided by user]'}

${args.baseline_vitals ? `My baseline vital signs: ${JSON.stringify(args.baseline_vitals)}` : ''}

Please evaluate my symptoms and tell me clearly:
- Whether I should rest, call my doctor, or go to the emergency room
- What red flags you're seeing (if any)
- What actions I should take right now
- When I should seek immediate help

Be direct and clear - I need to know if this is urgent.`,
  },

  /**
   * Prompt 3: Recovery Timeline Only
   * Guides the model to create a detailed day-by-day recovery plan
   */
  recoveryTimelineDetailed: {
    name: 'recovery-timeline-detailed',
    description:
      'Detailed recovery timeline: create a comprehensive day-by-day plan with meals, medications, activities, and warning signs',
    arguments: {
      diagnoses: 'List of diagnoses',
      medications: 'List of medications',
      dietary_restrictions: 'List of dietary restrictions',
      activity_restrictions: 'List of activity restrictions',
      total_days: 'Number of days to plan (default 14)',
    },
    template: (args: Record<string, unknown>) => `Create a detailed recovery timeline for my post-hospital recovery.

My discharge information:
- Diagnoses: ${args.diagnoses || '[Will be provided]'}
- Medications: ${args.medications || '[Will be provided]'}
- Dietary restrictions: ${args.dietary_restrictions || '[Will be provided]'}
- Activity restrictions: ${args.activity_restrictions || '[Will be provided]'}
- Recovery duration: ${args.total_days || '14'} days

Please create a day-by-day recovery plan that includes:
1. Meal guidelines for each day (considering my dietary restrictions)
2. Hydration targets
3. Medication schedule with times
4. Activity guidelines (what I can and can't do)
5. Warning signs to watch for each day
6. General recovery tips

Make it practical and easy to follow.`,
  },

  /**
   * Prompt 4: Safe Grocery Shopping
   * Guides the model to create a filtered shopping list
   */
  safeGroceryShopping: {
    name: 'safe-grocery-shopping',
    description:
      'Safe grocery shopping: create a shopping list filtered for dietary restrictions and medication interactions',
    arguments: {
      dietary_restrictions: 'List of dietary restrictions',
      medications: 'List of medications',
      patient_name: 'Optional patient name',
    },
    template: (args: Record<string, unknown>) => `Help me create a safe grocery shopping list for my recovery.

My restrictions and medications:
- Dietary restrictions: ${args.dietary_restrictions || '[Will be provided]'}
- Current medications: ${args.medications || '[Will be provided]'}
- Patient name: ${args.patient_name || '[Optional]'}

Please create a shopping list that:
1. Respects all my dietary restrictions
2. Avoids foods that interact with my medications
3. Includes quantities and estimated prices
4. Provides shopping tips and preparation notes
5. Flags any items I should avoid

I want to make sure everything I buy is safe for my recovery.`,
  },

  /**
   * Prompt 5: Care Coordination
   * Guides the model to coordinate pharmacy delivery and appointments
   */
  careCoordination: {
    name: 'care-coordination',
    description:
      'Care coordination: generate pharmacy delivery orders and schedule follow-up appointments',
    arguments: {
      medications: 'List of medications to deliver',
      follow_ups: 'List of follow-up appointments',
      patient_name: 'Patient name',
      patient_email: 'Optional patient email',
    },
    template: (args: Record<string, unknown>) => `Help me coordinate my post-discharge care services.

My information:
- Medications to deliver: ${args.medications || '[Will be provided]'}
- Follow-up appointments needed: ${args.follow_ups || '[Will be provided]'}
- Patient name: ${args.patient_name || '[Will be provided]'}
- Email: ${args.patient_email || '[Optional]'}

Please:
1. Create a pharmacy delivery order for my medications
2. Schedule calendar invites for my follow-up appointments
3. Provide the order details and appointment times
4. Include any special instructions for delivery

I want everything coordinated so I don't have to worry about it.`,
  },

  /**
   * Prompt 6: Medication Management
   * Guides the model to explain medication schedule and safety
   */
  medicationManagement: {
    name: 'medication-management',
    description:
      'Medication management: explain medication schedule, dosages, and safety guidelines',
    arguments: {
      medications: 'List of medications',
    },
    template: (args: Record<string, unknown>) => `I need help understanding my medication schedule and safety.

My medications:
${args.medications || '[Medications will be provided]'}

Please explain:
1. When to take each medication (exact times)
2. How to take each medication (with food, with water, etc.)
3. What to do if I miss a dose
4. Any foods or other medications to avoid
5. What side effects to expect
6. When to call my doctor about medication concerns

I want to make sure I'm taking my medications correctly and safely.`,
  },

  /**
   * Prompt 7: Activity & Exercise Guidelines
   * Guides the model to explain safe activity progression
   */
  activityGuidelines: {
    name: 'activity-guidelines',
    description:
      'Activity guidelines: explain safe activity progression and exercise recommendations during recovery',
    arguments: {
      condition: 'Patient condition',
      activity_restrictions: 'List of activity restrictions',
      total_days: 'Recovery timeline in days',
    },
    template: (args: Record<string, unknown>) => `I need guidance on what activities are safe during my recovery.

My discharge information:
- Condition: ${args.condition || '[Will be provided]'}
- Activity restrictions: ${args.activity_restrictions || '[Will be provided]'}
- Recovery timeline: ${args.total_days || '14'} days

Please explain:
1. What activities I should avoid completely
2. What activities I can do with limitations
3. How to gradually increase my activity level
4. Safe exercises for each week of recovery
5. When I can return to normal activities
6. Warning signs that I'm doing too much

I want to recover safely without overdoing it.`,
  },

  /**
   * Prompt 8: Dietary Guidance
   * Guides the model to explain dietary restrictions and meal planning
   */
  dietaryGuidance: {
    name: 'dietary-guidance',
    description:
      'Dietary guidance: explain dietary restrictions and provide meal planning recommendations',
    arguments: {
      dietary_restrictions: 'List of dietary restrictions',
      medications: 'List of medications',
    },
    template: (args: Record<string, unknown>) => `I need help understanding my dietary restrictions and meal planning.

My dietary restrictions:
${args.dietary_restrictions || '[Restrictions will be provided]'}

My medications:
${args.medications || '[Medications will be provided]'}

Please explain:
1. Why each dietary restriction is important for my recovery
2. What foods I should eat and avoid
3. Sample meal ideas for each day
4. How to prepare meals safely
5. Foods that interact with my medications
6. Hydration guidelines
7. When I can return to my normal diet

I want to eat well while following my restrictions.`,
  },

  /**
   * Prompt 9: Emergency Preparedness
   * Guides the model to explain emergency warning signs and response
   */
  emergencyPreparedness: {
    name: 'emergency-preparedness',
    description:
      'Emergency preparedness: explain warning signs and when to seek emergency care',
    arguments: {
      diagnosis: 'Patient diagnosis',
      recovery_stage: 'Current recovery stage',
    },
    template: (args: Record<string, unknown>) => `I want to be prepared for emergencies during my recovery.

My condition:
- Diagnosis: ${args.diagnosis || '[Will be provided]'}
- Recent hospitalization: Yes
- Recovery stage: ${args.recovery_stage || 'Early'}

Please explain:
1. What are the red flag symptoms I should watch for?
2. When should I call my doctor vs. go to the ER?
3. What should I do if I experience each red flag symptom?
4. What information should I have ready if I need emergency care?
5. Who should I contact first (doctor, ER, 911)?
6. What should I bring to the ER (discharge papers, medication list, etc.)?

I want to know exactly what to do if something goes wrong.`,
  },

  /**
   * Prompt 10: Follow-up Appointment Preparation
   * Guides the model to help prepare for follow-up appointments
   */
  followupPreparation: {
    name: 'followup-preparation',
    description:
      'Follow-up appointment preparation: help prepare questions and information for doctor visits',
    arguments: {
      follow_ups: 'List of upcoming appointments',
      days_since_discharge: 'Days since discharge',
      current_symptoms: 'Current symptoms',
      medication_compliance: 'Medication compliance status',
    },
    template: (args: Record<string, unknown>) => `Help me prepare for my follow-up appointments.

My upcoming appointments:
${args.follow_ups || '[Appointments will be provided]'}

My recovery progress:
- Days since discharge: ${args.days_since_discharge || '[Will be provided]'}
- Current symptoms: ${args.current_symptoms || '[Will be provided]'}
- Medication compliance: ${args.medication_compliance || '[Will be provided]'}

Please help me:
1. Prepare a list of questions to ask my doctor
2. Document my recovery progress to share
3. List any symptoms or concerns to discuss
4. Prepare information about my medications and side effects
5. Understand what tests or exams to expect
6. Know what to bring to the appointment

I want to make the most of my follow-up visits.`,
  },
};

/**
 * Helper function to get a prompt template
 */
export function getPromptTemplate(
  promptName: keyof typeof AFTERCARE_PROMPTS,
  args: Record<string, unknown> = {}
): string {
  const prompt = AFTERCARE_PROMPTS[promptName];
  if (!prompt) {
    throw new Error(`Prompt "${promptName}" not found`);
  }
  return prompt.template(args);
}

/**
 * Helper function to list all available prompts
 */
export function listPrompts() {
  return Object.entries(AFTERCARE_PROMPTS).map(([key, prompt]) => ({
    id: key,
    name: prompt.name,
    description: prompt.description,
    arguments: prompt.arguments,
  }));
}
