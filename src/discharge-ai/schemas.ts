/**
 * AfterCare Discharge AI - Core Data Schemas
 * Defines TypeScript interfaces for discharge summaries, recovery timelines, and care coordination.
 */

/**
 * Medication details extracted from discharge summary
 */
export interface Medication {
  name: string;
  dosage: string; // e.g., "500mg"
  frequency: string; // e.g., "twice daily", "every 8 hours"
  route: string; // e.g., "oral", "topical", "injection"
  duration?: string; // e.g., "7 days", "until follow-up"
  instructions?: string; // Special instructions (e.g., "take with food")
  reason?: string; // Why prescribed (e.g., "pain management", "infection prevention")
}

/**
 * Dietary restriction or recommendation
 */
export interface DietaryRestriction {
  type: string; // e.g., "low-sodium", "diabetic", "gluten-free", "liquid-only"
  reason?: string; // Why (e.g., "kidney function", "post-surgery")
  duration?: string; // How long to follow
}

/**
 * Activity or movement restriction
 */
export interface ActivityRestriction {
  restriction: string; // e.g., "no heavy lifting", "bed rest", "limited walking"
  weight_limit?: string; // e.g., "nothing over 5 lbs"
  duration?: string; // How long
  reason?: string; // Why
}

/**
 * Follow-up appointment or check-in
 */
export interface FollowUp {
  provider_type: string; // e.g., "primary care", "cardiologist", "physical therapy"
  provider_name?: string;
  specialty?: string;
  timing: string; // e.g., "1 week", "2 weeks", "as needed"
  reason?: string; // Why this follow-up
  contact_info?: string;
}

/**
 * Critical data flags for missing information
 */
export interface MissingDataFlag {
  field: string; // e.g., "allergies", "kidney_function", "medication_dosages"
  severity: "critical" | "high" | "medium"; // How important to obtain
  message: string; // Plain-language explanation
}

/**
 * Complete discharge summary with extracted and flagged data
 */
export interface DischargeSummary {
  patient_name?: string;
  discharge_date: string;
  admission_reason: string; // Plain-language diagnosis
  diagnoses: string[]; // List of diagnoses in plain language
  medications: Medication[];
  dietary_restrictions: DietaryRestriction[];
  activity_restrictions: ActivityRestriction[];
  follow_ups: FollowUp[];
  allergies?: string[]; // Known allergies
  kidney_function?: string; // e.g., "normal", "stage 2 CKD"
  liver_function?: string;
  other_conditions?: string[]; // Comorbidities
  missing_data_flags: MissingDataFlag[];
  raw_summary?: string; // Original discharge text (for reference)
}

/**
 * Single day in recovery timeline
 */
export interface RecoveryDay {
  day_number: number;
  date?: string;
  title: string; // e.g., "Day 1: Initial Recovery"
  meals: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snacks?: string;
  };
  hydration_target: string; // e.g., "8 glasses of water"
  medications: {
    time: string; // e.g., "8:00 AM"
    medication_name: string;
    dosage: string;
    instructions?: string;
  }[];
  activity_guidelines: string[];
  warning_signs: string[]; // What to watch for
  notes?: string;
}

/**
 * Complete recovery timeline (day-by-day checklist)
 */
export interface RecoveryTimeline {
  patient_name?: string;
  start_date: string;
  total_days: number;
  condition: string; // e.g., "post-appendectomy recovery"
  days: RecoveryDay[];
  general_guidelines?: string[];
  emergency_contacts?: {
    provider_name?: string;
    phone?: string;
    after_hours_line?: string;
  };
}

/**
 * Single grocery item with safety annotations
 */
export interface GroceryItem {
  name: string;
  category: string; // e.g., "protein", "vegetable", "dairy", "grain"
  quantity: string; // e.g., "2 lbs", "1 dozen", "1 container"
  unit_price?: number;
  reason?: string; // Why recommended (e.g., "high protein for healing")
  preparation_notes?: string; // e.g., "cook until soft", "blend into smoothie"
  safe_for_restrictions: boolean; // Passes all dietary + drug-interaction checks
  warnings?: string[]; // Any cautions (e.g., "may interact with blood thinner")
}

/**
 * Curated grocery cart with filtering applied
 */
export interface GroceryCart {
  patient_name?: string;
  dietary_restrictions: string[];
  medications_considered: string[]; // Meds checked for interactions
  items: GroceryItem[];
  estimated_total?: number;
  shopping_tips?: string[];
  missing_data_warnings?: string[]; // e.g., "allergy info incomplete"
}

/**
 * Pharmacy delivery order payload for external API
 */
export interface PharmacyDeliveryPayload {
  order_id?: string;
  patient_name?: string;
  medications: {
    name: string;
    dosage: string;
    quantity: number;
    frequency: string;
    refills?: number;
  }[];
  delivery_address?: string;
  delivery_date?: string;
  pharmacy_contact?: string;
  special_instructions?: string;
}

/**
 * Calendar invite payload for follow-up appointments
 */
export interface CalendarInvitePayload {
  event_id?: string;
  title: string; // e.g., "Follow-up with Dr. Smith"
  description?: string;
  start_datetime: string; // ISO 8601
  end_datetime: string;
  provider_name?: string;
  provider_email?: string;
  location?: string;
  reason?: string;
  patient_name?: string;
  patient_email?: string;
}

/**
 * Care service coordination payloads
 */
export interface CareServicePayload {
  service_type: "pharmacy_delivery" | "calendar_scheduling";
  pharmacy_delivery?: PharmacyDeliveryPayload;
  calendar_invite?: CalendarInvitePayload;
  timestamp?: string;
}

/**
 * Symptom evaluation result
 */
export interface SymptomEvaluation {
  reported_symptoms: string[];
  evaluation_timestamp?: string;
  recommendation: "rest" | "call_doctor" | "go_to_er";
  reasoning: string; // Plain-language explanation
  red_flags_detected: string[]; // Which warning signs matched
  suggested_actions: string[]; // What to do next
  emergency_contact?: string;
  missing_data_warnings?: string[]; // e.g., "baseline vital signs unknown"
}

/**
 * Red flag symptom definition
 */
export interface RedFlagSymptom {
  symptom: string;
  severity: "mild" | "moderate" | "severe";
  action: "rest" | "call_doctor" | "go_to_er";
  description: string;
}
