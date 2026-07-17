# AfterCare Discharge AI Module

**Post-Hospital Recovery Coordinator MCP Server**

A comprehensive Model Context Protocol (MCP) server for coordinating post-hospital recovery, translating medical jargon to plain language, and providing patient-safe guidance through the recovery process.

---

## Overview

AfterCare is designed to help patients and caregivers navigate the critical post-discharge period by:

1. **Extracting and translating** medical discharge information into plain-language guidance
2. **Creating personalized recovery timelines** with day-by-day checklists
3. **Building safe grocery lists** that respect dietary restrictions and medication interactions
4. **Coordinating care services** (pharmacy delivery, appointment scheduling)
5. **Evaluating symptoms** against medical red flags to guide when to seek help

---

## Architecture

### File Structure

```
src/discharge-ai/
├── schemas.ts          # TypeScript interfaces for all data types
├── safety.ts           # Guardrail validators and jargon translation
├── tools.ts            # Five core MCP tools
├── fixtures.ts         # Mock discharge summaries for testing
└── README.md           # This file
```

### Core Components

#### 1. **schemas.ts** — Data Type Definitions

Defines all TypeScript interfaces used throughout the module:

- `Medication` — Prescription details (name, dosage, frequency, route, instructions)
- `DietaryRestriction` — Dietary guidelines (type, reason, duration)
- `ActivityRestriction` — Movement/activity limitations
- `FollowUp` — Appointment scheduling information
- `DischargeSummary` — Complete discharge record with extracted data
- `RecoveryTimeline` — Day-by-day recovery checklist
- `GroceryCart` — Curated shopping list with safety annotations
- `CareServicePayload` — API payloads for external integrations
- `SymptomEvaluation` — Symptom assessment results
- `RedFlagSymptom` — Emergency warning sign definitions

#### 2. **safety.ts** — Guardrails & Validators

Implements strict safety checks and patient-friendly translations:

**Key Functions:**

- `translateMedicalJargon(text)` — Converts medical terminology to plain English
  - Maps 100+ medical terms (diagnoses, procedures, medications, symptoms)
  - Example: "myocardial_infarction" → "heart attack"

- `flagMissingCriticalData(data)` — Identifies incomplete information
  - Checks for allergies, kidney/liver function, medication dosages
  - Returns severity levels (critical, high, medium)
  - Prevents unsafe recommendations when data is incomplete

- `checkDrugFoodInteractions(foodName, medications)` — Validates food safety
  - Cross-references medications against known food interactions
  - Example: Warfarin + spinach (high vitamin K) → warning
  - Prevents dangerous combinations

- `filterGroceryItemsByRestrictions(items, restrictions, medications)` — Curates shopping list
  - Filters by dietary type (low-sodium, diabetic, gluten-free, liquid-only)
  - Removes items with drug interactions
  - Returns annotated items with warnings

- `evaluateSymptoms(symptoms)` — Assesses symptom severity
  - Compares reported symptoms to 14 red-flag definitions
  - Returns recommendation: "rest", "call_doctor", or "go_to_er"
  - Provides reasoning and suggested actions

**Red Flag Symptoms:**

- **Go to ER:** Chest pain, severe shortness of breath, severe bleeding, loss of consciousness, severe allergic reaction
- **Call Doctor:** High fever (>101°F), severe pain, wound infection, persistent vomiting, inability to take medications
- **Rest:** Mild fever, mild nausea, mild headache, fatigue

#### 3. **tools.ts** — MCP Tool Implementations

Five core tools registered with the MCP server:

##### Tool 1: `analyze_discharge_summary`

**Purpose:** Extract and translate medical discharge information

**Input:**
```json
{
  "discharge_text": "Patient admitted with acute appendicitis...",
  "patient_name": "John Smith",
  "discharge_date": "2024-01-25"
}
```

**Output:**
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
      "duration": "7 days",
      "instructions": "Take with food to reduce stomach upset",
      "reason": "Infection prevention post-surgery"
    }
  ],
  "dietary_restrictions": [
    {"type": "low-sodium", "reason": "Hypertension management"},
    {"type": "diabetic", "reason": "Blood sugar control"}
  ],
  "activity_restrictions": [
    {"restriction": "No heavy lifting", "weight_limit": "5 lbs", "duration": "4 weeks"}
  ],
  "follow_ups": [
    {
      "provider_type": "Surgeon",
      "provider_name": "Dr. Sarah Johnson",
      "timing": "1 week",
      "reason": "Incision check and suture removal"
    }
  ],
  "missing_data_flags": [
    {
      "field": "allergies",
      "severity": "critical",
      "message": "No allergies documented. This is critical for medication safety..."
    }
  ]
}
```

**Safety Features:**
- Translates all medical jargon to plain language
- Flags missing critical data (allergies, kidney function, dosages)
- Validates medication completeness
- Never suggests medication changes

##### Tool 2: `generate_recovery_timeline`

**Purpose:** Create a day-by-day recovery checklist

**Input:**
```json
{
  "discharge_summary": {
    "diagnoses": ["Appendix inflammation"],
    "medications": [
      {"name": "Amoxicillin", "dosage": "500mg", "frequency": "three times daily"}
    ],
    "dietary_restrictions": [{"type": "low-sodium"}],
    "activity_restrictions": [{"restriction": "No heavy lifting"}]
  },
  "total_days": 14
}
```

**Output:**
```json
{
  "patient_name": "John Smith",
  "start_date": "2024-01-25",
  "total_days": 14,
  "condition": "Appendix inflammation recovery",
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
        "Redness, warmth, or pus at incision"
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
  ]
}
```

**Safety Features:**
- Progressively increases activity recommendations
- Includes warning signs for each day
- Uses plain-language meal descriptions
- Medication schedule aligned with frequency

##### Tool 3: `build_grocery_cart`

**Purpose:** Generate a safe, curated shopping list

**Input:**
```json
{
  "dietary_restrictions": ["low-sodium", "diabetic"],
  "medications": [
    {"name": "Metformin", "dosage": "1000mg"},
    {"name": "Lisinopril", "dosage": "10mg"}
  ],
  "patient_name": "John Smith"
}
```

**Output:**
```json
{
  "patient_name": "John Smith",
  "dietary_restrictions": ["low-sodium", "diabetic"],
  "medications_considered": ["Metformin", "Lisinopril"],
  "items": [
    {
      "name": "Chicken breast",
      "category": "protein",
      "quantity": "2 lbs",
      "unit_price": 8.99,
      "reason": "Lean protein for wound healing",
      "preparation_notes": "Bake or poach; avoid frying",
      "safe_for_restrictions": true
    },
    {
      "name": "Broccoli",
      "category": "vegetable",
      "quantity": "2 lbs",
      "unit_price": 3.99,
      "reason": "Vitamin C and fiber for healing",
      "preparation_notes": "Steam until soft; avoid raw",
      "safe_for_restrictions": true,
      "warnings": ["High potassium content; monitor with Lisinopril"]
    }
  ],
  "estimated_total": 89.50,
  "shopping_tips": [
    "Buy fresh produce; frozen is acceptable if fresh is unavailable",
    "Check expiration dates on all items",
    "Choose low-sodium versions of canned goods",
    "Ask pharmacist about any food-medication interactions"
  ]
}
```

**Safety Features:**
- Filters out high-sodium foods for low-sodium diets
- Removes high-sugar foods for diabetic diets
- Checks all items against drug-food interactions
- Includes preparation notes for post-surgery patients
- Flags items with warnings but includes them if safe

##### Tool 4: `coordinate_care_services`

**Purpose:** Generate API payloads for external integrations

**Input:**
```json
{
  "service_type": "both",
  "medications": [
    {"name": "Amoxicillin", "dosage": "500mg", "quantity": 21, "frequency": "three times daily"}
  ],
  "follow_ups": [
    {"provider_type": "Surgeon", "provider_name": "Dr. Sarah Johnson", "timing": "1 week"}
  ],
  "patient_name": "John Smith",
  "patient_email": "john@example.com"
}
```

**Output:**
```json
[
  {
    "service_type": "pharmacy_delivery",
    "pharmacy_delivery": {
      "order_id": "ORD-1706123456789",
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
    "timestamp": "2024-01-25T10:30:00Z"
  },
  {
    "service_type": "calendar_scheduling",
    "calendar_invite": {
      "event_id": "EVT-1706123456789-0.123",
      "title": "Follow-up: Surgeon",
      "description": "Post-discharge follow-up appointment",
      "start_datetime": "2024-02-01T10:00:00Z",
      "end_datetime": "2024-02-01T11:00:00Z",
      "provider_name": "Dr. Sarah Johnson",
      "patient_name": "John Smith",
      "patient_email": "john@example.com"
    },
    "timestamp": "2024-01-25T10:30:00Z"
  }
]
```

**Safety Features:**
- Generates valid API payloads for external systems
- Calculates delivery dates (next business day)
- Schedules appointments based on timing (e.g., "1 week" → 7 days)
- Includes patient contact information for coordination
- Never modifies medication orders

##### Tool 5: `evaluate_symptom_warning`

**Purpose:** Assess symptoms and guide emergency response

**Input:**
```json
{
  "symptoms": ["fever of 102°F", "severe chest pain", "shortness of breath"],
  "patient_name": "John Smith",
  "baseline_vitals": {
    "temperature": 98.6,
    "heart_rate": 72,
    "blood_pressure": "120/80"
  }
}
```

**Output:**
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
  "emergency_contact": "911",
  "missing_data_warnings": [
    "Baseline vital signs not provided; symptom evaluation is general guidance only"
  ]
}
```

**Safety Features:**
- Evaluates symptoms against 14 red-flag definitions
- Provides clear, actionable recommendations
- Includes emergency contact information
- Flags missing baseline data for context
- Never diagnoses; only guides to appropriate care level

#### 4. **fixtures.ts** — Mock Data

Provides realistic sample data for testing and demonstration:

- `SAMPLE_DISCHARGE_APPENDECTOMY` — Post-appendectomy patient with diabetes and hypertension
- `SAMPLE_DISCHARGE_CARDIAC` — Post-cardiac event patient with multiple comorbidities
- `SAMPLE_GROCERY_ITEMS` — 20 curated food items with nutritional information

---

## Safety & Guardrails

### Core Principles

1. **Never Prescribe or Modify Medications**
   - Tools only coordinate delivery of exactly what was prescribed
   - No suggestions for medication changes or substitutions
   - All medication information comes from discharge summary

2. **Translate Medical Jargon**
   - All patient-facing output uses plain language
   - 100+ medical terms mapped to everyday language
   - Ensures patient understanding and compliance

3. **Flag Missing Critical Data**
   - Allergies, kidney/liver function, dosages are flagged if missing
   - Severity levels guide UI prompts for additional information
   - Prevents unsafe recommendations with incomplete data

4. **Strict Dietary & Drug Interaction Filtering**
   - Grocery items checked against all dietary restrictions
   - Food-medication interactions validated before recommendation
   - Items with warnings are flagged but included if safe

5. **Clear Emergency Guidance**
   - Symptom evaluation provides unambiguous recommendations
   - Red flags trigger "go to ER" guidance
   - Includes emergency contact information

### Data Validation

All tools validate input data:

- **Medication completeness:** Name, dosage, frequency required
- **Dietary restrictions:** Type and reason validated
- **Activity restrictions:** Restriction and duration checked
- **Symptoms:** Matched against known red flags
- **Patient data:** Name and contact info optional but recommended

---

## Usage Examples

### Example 1: Complete Discharge Analysis

```typescript
// Input
const discharge = {
  discharge_text: "Patient admitted with acute appendicitis...",
  patient_name: "John Smith",
  discharge_date: "2024-01-25"
};

// Tool: analyze_discharge_summary
// Output: Structured discharge summary with plain-language translations
```

### Example 2: Recovery Timeline for Patient

```typescript
// Input
const timeline = {
  discharge_summary: {
    diagnoses: ["Appendix inflammation"],
    medications: [
      { name: "Amoxicillin", dosage: "500mg", frequency: "three times daily" }
    ],
    dietary_restrictions: [{ type: "low-sodium" }],
    activity_restrictions: [{ restriction: "No heavy lifting" }]
  },
  total_days: 14
};

// Tool: generate_recovery_timeline
// Output: Day-by-day checklist with meals, medications, activities, warnings
```

### Example 3: Safe Grocery Shopping

```typescript
// Input
const cart = {
  dietary_restrictions: ["low-sodium", "diabetic"],
  medications: [
    { name: "Metformin", dosage: "1000mg" },
    { name: "Lisinopril", dosage: "10mg" }
  ],
  patient_name: "John Smith"
};

// Tool: build_grocery_cart
// Output: Curated shopping list with prices, preparation notes, warnings
```

### Example 4: Symptom Evaluation

```typescript
// Input
const symptoms = {
  symptoms: ["fever of 102°F", "severe chest pain", "shortness of breath"],
  patient_name: "John Smith"
};

// Tool: evaluate_symptom_warning
// Output: "go_to_er" recommendation with emergency guidance
```

---

## Integration Points

### External Services

The `coordinate_care_services` tool generates payloads for:

1. **Pharmacy Delivery APIs**
   - Medication name, dosage, quantity, frequency
   - Delivery address and date
   - Special instructions

2. **Calendar/Scheduling APIs**
   - Event title, description, date/time
   - Provider information
   - Patient contact details

### Data Flow

```
Discharge Summary
    ↓
analyze_discharge_summary
    ↓
Structured Data
    ├→ generate_recovery_timeline → Day-by-day checklist
    ├→ build_grocery_cart → Safe shopping list
    ├→ coordinate_care_services → API payloads
    └→ evaluate_symptom_warning → Emergency guidance
```

---

## Testing

### Smoke Tests

All five tools have been smoke-tested with realistic scenarios:

1. ✅ `analyze_discharge_summary` — Parses discharge text, extracts data, flags missing info
2. ✅ `generate_recovery_timeline` — Creates 7-14 day checklists with progressive activity
3. ✅ `build_grocery_cart` — Filters items by restrictions and drug interactions
4. ✅ `coordinate_care_services` — Generates pharmacy and calendar payloads
5. ✅ `evaluate_symptom_warning` — Evaluates symptoms, recommends ER/doctor/rest

### Mock Data

Two complete discharge summaries provided in `fixtures.ts`:
- Post-appendectomy with diabetes and hypertension
- Post-cardiac event with multiple comorbidities

---

## Future Enhancements

1. **Medication Interaction Database** — Expand drug-drug interactions beyond food
2. **Vital Signs Tracking** — Monitor temperature, heart rate, blood pressure trends
3. **Appointment Reminders** — Integrate with notification systems
4. **Caregiver Coordination** — Support for family members and home health aides
5. **Insurance & Billing** — Coordinate with insurance for medication coverage
6. **Telehealth Integration** — Schedule virtual follow-ups with providers
7. **Multilingual Support** — Translate plain-language output to other languages
8. **Accessibility Features** — Audio descriptions, high-contrast UI, screen reader support

---

## License

Part of the AfterCare MCP Server project. All code is provided as-is for healthcare coordination purposes.

---

## Support

For issues or questions about the discharge-ai module, refer to the main project README or contact the development team.
