# AfterCare MCP Resources Guide

**Declarative reference data for the five core tools**

---

## Overview

MCP Resources are declarative reference data that complement Tools. While Tools are model-invoked actions, Resources are persistent data structures that the model can read to understand context, schemas, and previous results.

The AfterCare server exposes **7 resources** across **5 tool domains**:

1. **Discharge Summary** — Latest structured discharge data
2. **Recovery Timeline** — Day-by-day recovery checklist
3. **Medication Schedule (Latest)** — Medications grouped by day
4. **Medication Schedule (Slots)** — Static reference for time slots
5. **Grocery Cart** — Latest safe shopping list
6. **Care Service Payloads** — Latest pharmacy/calendar orders
7. **Symptom Evaluation** — Latest symptom triage result

---

## Resource Architecture

### Data Flow

```
Tool Handler
    ↓
Computes Result
    ↓
Updates resourceCache.set(CACHE_KEY, result)
    ↓
Resource Handler
    ↓
Reads resourceCache.get(CACHE_KEY)
    ↓
Returns JSON via MCP Resource Protocol
```

### Cache Implementation

**File:** `src/discharge-ai/resource-cache.ts`

```typescript
class ResourceCache {
  private readonly store = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  clear(key: string): void {
    this.store.delete(key);
  }
}

export const resourceCache = new ResourceCache();

export const CACHE_KEYS = {
  DISCHARGE_SUMMARY: 'discharge:summary:latest',
  RECOVERY_TIMELINE: 'discharge:recovery-timeline:latest',
  GROCERY_CART: 'discharge:grocery-cart:latest',
  CARE_SERVICE_PAYLOADS: 'discharge:care-services:latest',
  SYMPTOM_EVALUATION: 'discharge:symptom-evaluation:latest',
} as const;
```

**Key Points:**
- In-memory singleton (no database)
- Shared between tools (write) and resources (read)
- Cleared on server restart
- No persistence (suitable for session-based workflows)

---

## Resource Definitions

### 1. Discharge Summary Resource

**URI:** `discharge://summary/latest`  
**Name:** `discharge_summary`  
**MIME Type:** `application/json`  
**Backed by Tool:** `analyze_discharge_summary`

#### Description
Latest structured discharge summary: diagnoses, medications, dietary/activity restrictions, follow-ups, missing-data flags.

#### Schema
```typescript
interface DischargeSummary {
  patient_name?: string;
  discharge_date: string;
  admission_reason: string;
  diagnoses: string[];
  medications: Medication[];
  dietary_restrictions: DietaryRestriction[];
  activity_restrictions: ActivityRestriction[];
  follow_ups: FollowUp[];
  missing_data_flags: MissingDataFlag[];
  raw_summary: string;
}
```

#### Example Response
```json
{
  "patient_name": "John Smith",
  "discharge_date": "2024-01-25",
  "admission_reason": "Appendix inflammation",
  "diagnoses": ["Appendix inflammation", "Diabetes", "High blood pressure"],
  "medications": [
    {
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "three times daily",
      "route": "oral",
      "reason": "As prescribed"
    }
  ],
  "dietary_restrictions": [
    { "type": "low-sodium", "reason": "As recommended" }
  ],
  "activity_restrictions": [
    { "restriction": "No heavy lifting", "duration": "1-4 weeks", "reason": "Post-operative recovery" }
  ],
  "follow_ups": [
    { "provider_type": "Primary Care", "timing": "1-2 weeks", "reason": "Post-discharge follow-up" }
  ],
  "missing_data_flags": [
    { "field": "allergies", "severity": "critical", "reason": "Critical for medication safety" }
  ],
  "raw_summary": "Patient admitted with acute appendicitis..."
}
```

#### Usage
```
User: "What was the patient discharged with?"
Assistant: [reads discharge://summary/latest]
Response: "John Smith was discharged with appendix inflammation, diabetes, and high blood pressure. He's on Amoxicillin 500mg three times daily..."
```

---

### 2. Recovery Timeline Resource

**URI:** `discharge://recovery-timeline/latest`  
**Name:** `recovery_timeline`  
**MIME Type:** `application/json`  
**Backed by Tool:** `generate_recovery_timeline`

#### Description
Latest day-by-day recovery timeline: meals, hydration, medication times, activity guidelines, warning signs.

#### Schema
```typescript
interface RecoveryTimeline {
  start_date: string;
  total_days: number;
  condition: string;
  days: RecoveryDay[];
  general_guidelines: string[];
  emergency_contacts: { after_hours_line: string };
}

interface RecoveryDay {
  day_number: number;
  date: string;
  title: string;
  meals: { breakfast: string; lunch: string; dinner: string; snacks: string };
  hydration_target: string;
  medications: Array<{ time: string; medication_name: string; dosage: string; instructions: string }>;
  activity_guidelines: string[];
  warning_signs: string[];
  notes?: string;
}
```

#### Example Response
```json
{
  "start_date": "2024-01-25",
  "total_days": 14,
  "condition": "Appendix inflammation",
  "days": [
    {
      "day_number": 1,
      "date": "2024-01-25",
      "title": "Day 1: Initial Recovery",
      "meals": {
        "breakfast": "Clear broth or water",
        "lunch": "Clear broth or water",
        "dinner": "Clear broth or water",
        "snacks": "Ice chips or water"
      },
      "hydration_target": "4-6 glasses of water",
      "medications": [
        {
          "time": "8:00 AM",
          "medication_name": "Amoxicillin",
          "dosage": "500mg",
          "instructions": "Take as directed"
        }
      ],
      "activity_guidelines": [
        "Rest in bed; minimal movement",
        "Use call button for assistance"
      ],
      "warning_signs": [
        "Fever above 101°F (38.3°C)",
        "Increased pain not relieved by medication",
        "Redness, warmth, or pus at incision",
        "Difficulty breathing",
        "Chest pain or pressure"
      ],
      "notes": "Focus on rest and hydration. Pain is normal; use medication as prescribed."
    }
  ],
  "general_guidelines": [
    "Take all medications exactly as prescribed",
    "Follow dietary restrictions strictly",
    "Stay hydrated throughout the day",
    "Gradually increase activity as tolerated",
    "Keep all follow-up appointments",
    "Call your doctor if you have concerns"
  ],
  "emergency_contacts": {
    "after_hours_line": "(555) 999-0000"
  }
}
```

#### Usage
```
User: "What should I eat on day 3?"
Assistant: [reads discharge://recovery-timeline/latest]
Response: "On day 3, you should have clear broth with soft crackers for lunch, and clear broth with soft vegetables for dinner. Stay hydrated with 8-10 glasses of water."
```

---

### 3. Medication Schedule (Latest) Resource

**URI:** `discharge://medication-schedule/latest`  
**Name:** `medication_schedule_latest`  
**MIME Type:** `application/json`  
**Derived from:** `generate_recovery_timeline`

#### Description
Latest medication schedule, derived from the recovery timeline and grouped by day.

#### Schema
```typescript
interface MedicationScheduleDay {
  day_number: number;
  date?: string;
  medications: Array<{
    time: string;
    medication_name: string;
    dosage: string;
    instructions: string;
  }>;
}
```

#### Example Response
```json
[
  {
    "day_number": 1,
    "date": "2024-01-25",
    "medications": [
      {
        "time": "8:00 AM",
        "medication_name": "Amoxicillin",
        "dosage": "500mg",
        "instructions": "Take as directed"
      },
      {
        "time": "2:00 PM",
        "medication_name": "Metformin",
        "dosage": "1000mg",
        "instructions": "Take as directed"
      },
      {
        "time": "8:00 PM",
        "medication_name": "Lisinopril",
        "dosage": "10mg",
        "instructions": "Take as directed"
      }
    ]
  }
]
```

#### Usage
```
User: "When should I take my medications?"
Assistant: [reads discharge://medication-schedule/latest]
Response: "Take Amoxicillin at 8:00 AM, Metformin at 2:00 PM, and Lisinopril at 8:00 PM."
```

---

### 4. Medication Schedule (Slots) Resource

**URI:** `discharge://medication-schedule/slots`  
**Name:** `medication_schedule_slots`  
**MIME Type:** `application/json`  
**Static Reference Data**

#### Description
Static reference list of administration time slots used to bucket medications.

#### Schema
```typescript
interface AdministrationSlot {
  id: string;
  label: string;
  typicalWindow: string;
}
```

#### Example Response
```json
[
  {
    "id": "morning",
    "label": "Morning",
    "typicalWindow": "06:00–10:00"
  },
  {
    "id": "afternoon",
    "label": "Afternoon",
    "typicalWindow": "12:00–15:00"
  },
  {
    "id": "evening",
    "label": "Evening",
    "typicalWindow": "17:00–19:00"
  },
  {
    "id": "night",
    "label": "Night",
    "typicalWindow": "20:00–23:00"
  }
]
```

#### Usage
```
User: "What are the medication time slots?"
Assistant: [reads discharge://medication-schedule/slots]
Response: "Medications are typically scheduled in four slots: Morning (6–10 AM), Afternoon (12–3 PM), Evening (5–7 PM), and Night (8–11 PM)."
```

---

### 5. Grocery Cart Resource

**URI:** `discharge://grocery-cart/latest`  
**Name:** `grocery_cart`  
**MIME Type:** `application/json`  
**Backed by Tool:** `build_grocery_cart`

#### Description
Latest compliant grocery shopping list: items, quantities, safety flags, interaction warnings.

#### Schema
```typescript
interface GroceryCart {
  patient_name?: string;
  dietary_restrictions: string[];
  medications_considered: string[];
  items: GroceryItem[];
  estimated_total: number;
  shopping_tips: string[];
  missing_data_warnings?: string[];
}

interface GroceryItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  notes?: string;
  safe_for_restrictions: boolean;
  interaction_warnings?: string[];
}
```

#### Example Response
```json
{
  "patient_name": "John Smith",
  "dietary_restrictions": ["low-sodium", "diabetic"],
  "medications_considered": ["Amoxicillin", "Metformin", "Lisinopril"],
  "items": [
    {
      "name": "Chicken Breast",
      "category": "Protein",
      "quantity": 2,
      "unit": "lbs",
      "unit_price": 8.99,
      "notes": "Skinless, grilled or baked",
      "safe_for_restrictions": true
    },
    {
      "name": "Brown Rice",
      "category": "Grains",
      "quantity": 1,
      "unit": "lb",
      "unit_price": 2.49,
      "notes": "Cook without salt",
      "safe_for_restrictions": true
    }
  ],
  "estimated_total": 45.67,
  "shopping_tips": [
    "Buy fresh produce; frozen is acceptable if fresh is unavailable",
    "Check expiration dates on all items",
    "Choose low-sodium versions of canned goods",
    "Ask pharmacist about any food-medication interactions",
    "Consider meal prep to save time during recovery"
  ]
}
```

#### Usage
```
User: "What should I buy at the grocery store?"
Assistant: [reads discharge://grocery-cart/latest]
Response: "Here's your safe shopping list: Chicken breast (2 lbs), brown rice (1 lb), carrots, broccoli... Total estimated cost: $45.67"
```

---

### 6. Care Service Payloads Resource

**URI:** `discharge://care-services/latest`  
**Name:** `care_service_payloads`  
**MIME Type:** `application/json`  
**Backed by Tool:** `coordinate_care_services`

#### Description
Latest generated pharmacy delivery and/or calendar invite payloads from care service coordination.

#### Schema
```typescript
interface CareServicePayload {
  service_type: 'pharmacy_delivery' | 'calendar_scheduling';
  pharmacy_delivery?: {
    order_id: string;
    patient_name?: string;
    medications: Array<{ name: string; dosage: string; quantity: number; frequency: string }>;
    delivery_date: string;
    special_instructions: string;
  };
  calendar_invite?: {
    event_id: string;
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    provider_name?: string;
    patient_name?: string;
    patient_email?: string;
    reason?: string;
  };
  timestamp: string;
}
```

#### Example Response
```json
[
  {
    "service_type": "pharmacy_delivery",
    "pharmacy_delivery": {
      "order_id": "ORD-1705939200000",
      "patient_name": "John Smith",
      "medications": [
        {
          "name": "Amoxicillin",
          "dosage": "500mg",
          "quantity": 21,
          "frequency": "three times daily"
        }
      ],
      "delivery_date": "2024-01-26",
      "special_instructions": "Deliver to patient home; signature required"
    },
    "timestamp": "2024-01-25T10:00:00Z"
  },
  {
    "service_type": "calendar_scheduling",
    "calendar_invite": {
      "event_id": "EVT-1705939200000-0.123",
      "title": "Follow-up: Surgeon",
      "description": "Post-discharge follow-up appointment",
      "start_datetime": "2024-02-01T10:00:00Z",
      "end_datetime": "2024-02-01T11:00:00Z",
      "provider_name": "Dr. Sarah Johnson",
      "patient_name": "John Smith",
      "patient_email": "john@example.com",
      "reason": "Post-operative follow-up"
    },
    "timestamp": "2024-01-25T10:00:00Z"
  }
]
```

#### Usage
```
User: "Schedule my follow-up appointments and arrange medication delivery"
Assistant: [reads discharge://care-services/latest]
Response: "I've created a pharmacy delivery order for your medications (arriving Jan 26) and scheduled your surgeon follow-up for Feb 1 at 10 AM. A calendar invite has been sent to john@example.com."
```

---

### 7. Symptom Evaluation Resource

**URI:** `discharge://symptom-evaluation/latest`  
**Name:** `symptom_evaluation`  
**MIME Type:** `application/json`  
**Backed by Tool:** `evaluate_symptom_warning`

#### Description
Latest symptom triage result: recommendation, red flags detected, and suggested actions.

#### Schema
```typescript
interface SymptomEvaluation {
  reported_symptoms: string[];
  evaluation_timestamp: string;
  recommendation: 'rest' | 'call_doctor' | 'go_to_er';
  reasoning: string;
  red_flags_detected: string[];
  suggested_actions: string[];
  emergency_contact: string;
  missing_data_warnings?: string[];
}
```

#### Example Response
```json
{
  "reported_symptoms": ["fever of 102°F", "severe chest pain", "shortness of breath"],
  "evaluation_timestamp": "2024-01-25T10:30:00Z",
  "recommendation": "go_to_er",
  "reasoning": "One or more symptoms suggest a medical emergency. Go to the nearest emergency room or call 911.",
  "red_flags_detected": ["chest pain", "shortness of breath"],
  "suggested_actions": [
    "Call 911 or go to the nearest emergency room immediately",
    "Bring discharge papers and medication list",
    "Inform ER staff of recent hospitalization"
  ],
  "emergency_contact": "911"
}
```

#### Usage
```
User: "I have chest pain and shortness of breath"
Assistant: [reads discharge://symptom-evaluation/latest]
Response: "⚠️ EMERGENCY: These symptoms require immediate medical attention. Call 911 or go to the nearest emergency room right now. Bring your discharge papers and medication list."
```

---

## Integration with Tools

### Tool → Resource Flow

Each tool updates the resource cache before returning:

```typescript
// In tool handler
const result = computeResult(...);

// Update resource cache
resourceCache.set(CACHE_KEYS.DISCHARGE_SUMMARY, result);

return result;
```

### Resource → Model Flow

The MCP Chat can read resources to understand context:

```
User: "What medications am I on?"
↓
Model reads discharge://summary/latest
↓
Model sees medications array
↓
Model responds with medication list
```

---

## Usage Patterns

### Pattern 1: Sequential Tool → Resource Read

```
1. User: "Analyze my discharge summary"
2. Tool: analyze_discharge_summary runs
3. Tool: Updates resourceCache
4. User: "What medications am I on?"
5. Model: Reads discharge://summary/latest
6. Model: Responds with medications
```

### Pattern 2: Resource-Only Query

```
1. User: "What's my recovery timeline?"
2. Model: Reads discharge://recovery-timeline/latest
3. Model: Responds with day-by-day plan
(No tool invocation needed)
```

### Pattern 3: Multi-Resource Coordination

```
1. User: "Create a shopping list and schedule my appointments"
2. Tool: build_grocery_cart runs → updates cache
3. Tool: coordinate_care_services runs → updates cache
4. Model: Reads discharge://grocery-cart/latest
5. Model: Reads discharge://care-services/latest
6. Model: Responds with both results
```

---

## Error Handling

### Empty Cache

If a resource is read before the corresponding tool has run:

```json
{
  "status": "empty",
  "message": "No discharge summary has been generated yet. Run analyze_discharge_summary first."
}
```

### Missing Data Warnings

Resources include `missing_data_warnings` when critical data is absent:

```json
{
  "missing_data_warnings": [
    "Baseline vital signs not provided; symptom evaluation is general guidance only"
  ]
}
```

---

## Performance Characteristics

| Resource | Latency | Size | Cache Hit Rate |
|----------|---------|------|----------------|
| discharge://summary/latest | <1ms | ~2 KB | 100% (after tool runs) |
| discharge://recovery-timeline/latest | <1ms | ~5 KB | 100% (after tool runs) |
| discharge://medication-schedule/latest | <1ms | ~3 KB | 100% (derived) |
| discharge://medication-schedule/slots | <1ms | ~500 B | 100% (static) |
| discharge://grocery-cart/latest | <1ms | ~4 KB | 100% (after tool runs) |
| discharge://care-services/latest | <1ms | ~3 KB | 100% (after tool runs) |
| discharge://symptom-evaluation/latest | <1ms | ~2 KB | 100% (after tool runs) |

---

## Best Practices

### 1. Always Check for Empty Cache
```typescript
const data = resourceCache.get<DischargeSummary>(CACHE_KEYS.DISCHARGE_SUMMARY);
if (!data) {
  return { status: 'empty', message: 'Run analyze_discharge_summary first' };
}
```

### 2. Include Missing Data Warnings
```typescript
missing_data_warnings: !input.baseline_vitals
  ? ['Baseline vital signs not provided; symptom evaluation is general guidance only']
  : undefined,
```

### 3. Use Consistent Cache Keys
```typescript
export const CACHE_KEYS = {
  DISCHARGE_SUMMARY: 'discharge:summary:latest',
  RECOVERY_TIMELINE: 'discharge:recovery-timeline:latest',
  // ... etc
} as const;
```

### 4. Update Cache Immediately After Computation
```typescript
const result = computeResult(...);
resourceCache.set(CACHE_KEYS.DISCHARGE_SUMMARY, result);
return result;
```

---

## Future Enhancements

### Planned Features
- [ ] Persistent cache (database backend)
- [ ] Cache expiration (TTL)
- [ ] Cache versioning
- [ ] Multi-patient support
- [ ] Resource subscriptions
- [ ] Real-time updates

### Extensibility
- Add new resources by creating new `Resource` definitions
- Update cache keys in `CACHE_KEYS` constant
- Integrate with external databases
- Add caching middleware

---

## Troubleshooting

### Resource Returns Empty
**Cause:** Tool hasn't run yet  
**Solution:** Run the corresponding tool first

### Resource Data Stale
**Cause:** Cache not updated after tool run  
**Solution:** Verify tool calls `resourceCache.set()` before returning

### Resource Not Found
**Cause:** URI mismatch  
**Solution:** Verify URI matches exactly (case-sensitive)

---

## Summary

AfterCare Resources provide a declarative, efficient way for the MCP Chat to access tool results and reference data. By combining Tools (actions) with Resources (data), the system enables rich, context-aware conversations about post-hospital recovery.

**Key Points:**
- ✅ 7 resources across 5 tool domains
- ✅ In-memory cache for fast access
- ✅ Automatic updates from tool handlers
- ✅ Empty-state handling
- ✅ Missing data warnings
- ✅ <1ms latency

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** 2024-01-25
