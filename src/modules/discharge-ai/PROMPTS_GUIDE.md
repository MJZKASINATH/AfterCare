# AfterCare MCP Prompts Guide

**Reusable prompt templates for common post-hospital recovery scenarios**

---

## Overview

The AfterCare MCP server includes **10 reusable prompts** that guide the model to use the right tools in the right order for common recovery scenarios. These prompts are designed to be flexible, parameterized, and easy to customize.

---

## Quick Reference

| Prompt ID | Name | Purpose | Primary Tools |
|-----------|------|---------|----------------|
| `completeRecoverySetup` | Complete Recovery Setup | Full post-discharge setup | All 5 tools |
| `quickSymptomCheck` | Quick Symptom Check | Symptom evaluation | `evaluate_symptom_warning` |
| `recoveryTimelineDetailed` | Recovery Timeline | Day-by-day plan | `generate_recovery_timeline` |
| `safeGroceryShopping` | Safe Grocery Shopping | Shopping list | `build_grocery_cart` |
| `careCoordination` | Care Coordination | Pharmacy & appointments | `coordinate_care_services` |
| `medicationManagement` | Medication Management | Medication guidance | (Resource-based) |
| `activityGuidelines` | Activity Guidelines | Activity progression | (Resource-based) |
| `dietaryGuidance` | Dietary Guidance | Meal planning | (Resource-based) |
| `emergencyPreparedness` | Emergency Preparedness | Emergency guidance | `evaluate_symptom_warning` |
| `followupPreparation` | Follow-up Preparation | Appointment prep | (Resource-based) |

---

## Prompt Details

### 1. Complete Recovery Setup

**ID:** `completeRecoverySetup`  
**Name:** Complete Recovery Setup  
**Description:** Complete post-discharge setup: analyze discharge summary, create recovery timeline, build grocery list, and coordinate care services

**Arguments:**
```typescript
{
  discharge_text: string;  // Raw discharge summary text from hospital
}
```

**Usage Example:**
```
User: "Help me set up my complete recovery plan"
Prompt: completeRecoverySetup
Arguments: {
  discharge_text: "Patient admitted with acute appendicitis and underwent emergency appendectomy. Prescribed amoxicillin 500mg three times daily..."
}
```

**Expected Flow:**
1. Tool: `analyze_discharge_summary` → extracts diagnoses, meds, restrictions
2. Tool: `generate_recovery_timeline` → creates 14-day plan
3. Tool: `build_grocery_cart` → generates safe shopping list
4. Tool: `coordinate_care_services` → schedules appointments & pharmacy delivery

**Output:** Comprehensive recovery plan with all components

---

### 2. Quick Symptom Check

**ID:** `quickSymptomCheck`  
**Name:** Quick Symptom Check  
**Description:** Quick symptom evaluation: assess reported symptoms and provide clear guidance (rest, call doctor, or go to ER)

**Arguments:**
```typescript
{
  symptoms: string[];           // List of reported symptoms
  baseline_vitals?: {           // Optional baseline vital signs
    temperature?: number;
    heart_rate?: number;
    blood_pressure?: string;
  };
}
```

**Usage Example:**
```
User: "I have chest pain and shortness of breath"
Prompt: quickSymptomCheck
Arguments: {
  symptoms: ["chest pain", "shortness of breath"],
  baseline_vitals: { temperature: 98.6, heart_rate: 72 }
}
```

**Expected Flow:**
1. Tool: `evaluate_symptom_warning` → assesses red flags
2. Response: Clear recommendation (rest/call_doctor/go_to_er)

**Output:** Emergency guidance with recommended actions

---

### 3. Recovery Timeline Detailed

**ID:** `recoveryTimelineDetailed`  
**Name:** Recovery Timeline  
**Description:** Detailed recovery timeline: create a comprehensive day-by-day plan with meals, medications, activities, and warning signs

**Arguments:**
```typescript
{
  diagnoses: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  dietary_restrictions: string[];
  activity_restrictions: string[];
  total_days?: number;  // Default: 14
}
```

**Usage Example:**
```
User: "Create my recovery timeline"
Prompt: recoveryTimelineDetailed
Arguments: {
  diagnoses: ["Appendix inflammation"],
  medications: [
    { name: "Amoxicillin", dosage: "500mg", frequency: "three times daily" }
  ],
  dietary_restrictions: ["low-sodium"],
  activity_restrictions: ["No heavy lifting"],
  total_days: 7
}
```

**Expected Flow:**
1. Tool: `generate_recovery_timeline` → creates day-by-day plan
2. Resource: `discharge://recovery-timeline/latest` → provides detailed timeline

**Output:** Day-by-day recovery plan with meals, meds, activities, warning signs

---

### 4. Safe Grocery Shopping

**ID:** `safeGroceryShopping`  
**Name:** Safe Grocery Shopping  
**Description:** Safe grocery shopping: create a shopping list filtered for dietary restrictions and medication interactions

**Arguments:**
```typescript
{
  dietary_restrictions: string[];  // e.g., ["low-sodium", "diabetic"]
  medications: Array<{
    name: string;
    dosage?: string;
  }>;
  patient_name?: string;
}
```

**Usage Example:**
```
User: "What should I buy at the grocery store?"
Prompt: safeGroceryShopping
Arguments: {
  dietary_restrictions: ["low-sodium", "diabetic"],
  medications: [
    { name: "Metformin", dosage: "1000mg" },
    { name: "Lisinopril", dosage: "10mg" }
  ],
  patient_name: "John Smith"
}
```

**Expected Flow:**
1. Tool: `build_grocery_cart` → generates filtered shopping list
2. Resource: `discharge://grocery-cart/latest` → provides shopping list

**Output:** Safe shopping list with items, quantities, prices, and tips

---

### 5. Care Coordination

**ID:** `careCoordination`  
**Name:** Care Coordination  
**Description:** Care coordination: generate pharmacy delivery orders and schedule follow-up appointments

**Arguments:**
```typescript
{
  medications: Array<{
    name: string;
    dosage: string;
    quantity: number;
    frequency: string;
  }>;
  follow_ups: Array<{
    provider_name?: string;
    provider_type: string;
    timing: string;
    reason?: string;
  }>;
  patient_name?: string;
  patient_email?: string;
}
```

**Usage Example:**
```
User: "Schedule my appointments and arrange medication delivery"
Prompt: careCoordination
Arguments: {
  medications: [
    { name: "Amoxicillin", dosage: "500mg", quantity: 21, frequency: "three times daily" }
  ],
  follow_ups: [
    { provider_type: "Surgeon", provider_name: "Dr. Sarah Johnson", timing: "1 week" }
  ],
  patient_name: "John Smith",
  patient_email: "john@example.com"
}
```

**Expected Flow:**
1. Tool: `coordinate_care_services` → generates API payloads
2. Resource: `discharge://care-services/latest` → provides orders & invites

**Output:** Pharmacy delivery order and calendar invite payloads

---

### 6. Medication Management

**ID:** `medicationManagement`  
**Name:** Medication Management  
**Description:** Medication management: explain medication schedule, dosages, and safety guidelines

**Arguments:**
```typescript
{
  medications: string;  // Formatted list of medications
}
```

**Usage Example:**
```
User: "Help me understand my medications"
Prompt: medicationManagement
Arguments: {
  medications: "Amoxicillin 500mg three times daily, Metformin 1000mg twice daily, Lisinopril 10mg once daily"
}
```

**Expected Flow:**
1. Resource: `discharge://medication-schedule/latest` → provides medication schedule
2. Resource: `discharge://medication-schedule/slots` → provides time slots

**Output:** Medication schedule with times, instructions, and safety guidelines

---

### 7. Activity Guidelines

**ID:** `activityGuidelines`  
**Name:** Activity Guidelines  
**Description:** Activity guidelines: explain safe activity progression and exercise recommendations during recovery

**Arguments:**
```typescript
{
  condition: string;
  activity_restrictions: string[];
  total_days?: number;  // Default: 14
}
```

**Usage Example:**
```
User: "What activities can I do during recovery?"
Prompt: activityGuidelines
Arguments: {
  condition: "Appendix inflammation",
  activity_restrictions: ["No heavy lifting"],
  total_days: 14
}
```

**Expected Flow:**
1. Resource: `discharge://recovery-timeline/latest` → provides activity guidelines

**Output:** Activity progression plan with safe exercises and restrictions

---

### 8. Dietary Guidance

**ID:** `dietaryGuidance`  
**Name:** Dietary Guidance  
**Description:** Dietary guidance: explain dietary restrictions and provide meal planning recommendations

**Arguments:**
```typescript
{
  dietary_restrictions: string;  // Formatted list of restrictions
  medications: string;           // Formatted list of medications
}
```

**Usage Example:**
```
User: "Help me understand my dietary restrictions"
Prompt: dietaryGuidance
Arguments: {
  dietary_restrictions: "Low-sodium, diabetic diet",
  medications: "Metformin 1000mg twice daily, Lisinopril 10mg once daily"
}
```

**Expected Flow:**
1. Resource: `discharge://grocery-cart/latest` → provides safe foods
2. Resource: `discharge://recovery-timeline/latest` → provides meal plans

**Output:** Dietary guidance with meal ideas and food-medication interactions

---

### 9. Emergency Preparedness

**ID:** `emergencyPreparedness`  
**Name:** Emergency Preparedness  
**Description:** Emergency preparedness: explain warning signs and when to seek emergency care

**Arguments:**
```typescript
{
  diagnosis: string;
  recovery_stage?: string;  // Default: "Early"
}
```

**Usage Example:**
```
User: "What should I watch for during recovery?"
Prompt: emergencyPreparedness
Arguments: {
  diagnosis: "Appendix inflammation",
  recovery_stage: "Early"
}
```

**Expected Flow:**
1. Tool: `evaluate_symptom_warning` → identifies red flags
2. Resource: `discharge://symptom-evaluation/latest` → provides guidance

**Output:** Emergency warning signs and response guidance

---

### 10. Follow-up Appointment Preparation

**ID:** `followupPreparation`  
**Name:** Follow-up Preparation  
**Description:** Follow-up appointment preparation: help prepare questions and information for doctor visits

**Arguments:**
```typescript
{
  follow_ups: string;           // Formatted list of appointments
  days_since_discharge?: string;
  current_symptoms?: string;
  medication_compliance?: string;
}
```

**Usage Example:**
```
User: "Help me prepare for my follow-up appointment"
Prompt: followupPreparation
Arguments: {
  follow_ups: "Surgeon follow-up in 1 week, Primary care in 2 weeks",
  days_since_discharge: "3",
  current_symptoms: "Mild incision pain, normal appetite",
  medication_compliance: "Taking all medications as prescribed"
}
```

**Expected Flow:**
1. Resource: `discharge://summary/latest` → provides discharge info
2. Resource: `discharge://recovery-timeline/latest` → provides recovery progress

**Output:** Appointment preparation guide with questions and documentation

---

## Usage Patterns

### Pattern 1: Direct Prompt Invocation

```typescript
import { getPromptTemplate } from './discharge-ai.prompts.js';

const template = getPromptTemplate('completeRecoverySetup', {
  discharge_text: 'Patient admitted with appendicitis...'
});

// Use template in MCP Chat
```

### Pattern 2: List Available Prompts

```typescript
import { listPrompts } from './discharge-ai.prompts.js';

const prompts = listPrompts();
// Returns array of all available prompts with descriptions
```

### Pattern 3: Parameterized Prompts

```typescript
const template = getPromptTemplate('recoveryTimelineDetailed', {
  diagnoses: ['Appendix inflammation'],
  medications: [{ name: 'Amoxicillin', dosage: '500mg', frequency: 'three times daily' }],
  dietary_restrictions: ['low-sodium'],
  activity_restrictions: ['No heavy lifting'],
  total_days: 7
});
```

---

## Integration with Tools & Resources

### Prompt → Tool Flow

```
Prompt: completeRecoverySetup
  ↓
Tool: analyze_discharge_summary
  ↓
Tool: generate_recovery_timeline
  ↓
Tool: build_grocery_cart
  ↓
Tool: coordinate_care_services
  ↓
Response: Complete recovery plan
```

### Prompt → Resource Flow

```
Prompt: medicationManagement
  ↓
Resource: discharge://medication-schedule/latest
  ↓
Resource: discharge://medication-schedule/slots
  ↓
Response: Medication guidance
```

---

## Best Practices

### 1. Use Specific Arguments
✅ **Good:**
```typescript
getPromptTemplate('recoveryTimelineDetailed', {
  diagnoses: ['Appendix inflammation'],
  medications: [{ name: 'Amoxicillin', dosage: '500mg', frequency: 'three times daily' }],
  dietary_restrictions: ['low-sodium'],
  activity_restrictions: ['No heavy lifting'],
  total_days: 7
})
```

❌ **Bad:**
```typescript
getPromptTemplate('recoveryTimelineDetailed', {})
```

### 2. Validate Arguments Before Passing
```typescript
if (!args.discharge_text || args.discharge_text.length === 0) {
  throw new Error('discharge_text is required');
}
```

### 3. Use Appropriate Prompt for Task
- **Complete setup?** → `completeRecoverySetup`
- **Emergency?** → `quickSymptomCheck`
- **Medication questions?** → `medicationManagement`
- **Activity questions?** → `activityGuidelines`

### 4. Chain Prompts for Complex Workflows
```typescript
// Step 1: Analyze discharge
const step1 = getPromptTemplate('completeRecoverySetup', { discharge_text });

// Step 2: Get medication details
const step2 = getPromptTemplate('medicationManagement', { medications });

// Step 3: Prepare for follow-up
const step3 = getPromptTemplate('followupPreparation', { follow_ups });
```

---

## Customization

### Adding a New Prompt

1. **Add to `AFTERCARE_PROMPTS` object:**
```typescript
myNewPrompt: {
  name: 'my-new-prompt',
  description: 'Description of what this prompt does',
  arguments: {
    arg1: 'Description of arg1',
    arg2: 'Description of arg2',
  },
  template: (args: Record<string, unknown>) => `
    Your prompt template here...
    ${args.arg1}
    ${args.arg2}
  `,
}
```

2. **Export helper function:**
```typescript
export function getMyNewPromptTemplate(args: Record<string, unknown>): string {
  return getPromptTemplate('myNewPrompt', args);
}
```

3. **Update documentation** with new prompt details

---

## Troubleshooting

### Prompt Not Found
**Error:** `Prompt "xyz" not found`  
**Solution:** Check the prompt ID matches exactly (case-sensitive)

### Missing Arguments
**Error:** Template shows `[Will be provided]` placeholders  
**Solution:** Pass all required arguments to `getPromptTemplate()`

### Unexpected Output
**Error:** Prompt generates wrong response  
**Solution:** Verify arguments are formatted correctly and match expected types

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Prompt Template Generation | <1ms |
| Prompt List Retrieval | <1ms |
| Average Prompt Length | 200-400 words |
| Tool Invocations per Prompt | 1-5 |
| Resource Reads per Prompt | 0-3 |

---

## Summary

AfterCare Prompts provide a flexible, reusable way to guide the model through common recovery scenarios. By combining prompts with tools and resources, you can create comprehensive, context-aware recovery plans for patients.

**Key Features:**
- ✅ 10 reusable prompt templates
- ✅ Parameterized for flexibility
- ✅ Integrated with tools and resources
- ✅ Easy to customize and extend
- ✅ Clear documentation and examples

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** 2024-01-25
