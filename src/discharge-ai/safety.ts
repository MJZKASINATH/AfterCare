/**
 * AfterCare Discharge AI - Safety & Guardrail Validators
 * Implements medical jargon translation, drug interaction checks, and dietary filtering.
 */

import type {
  MissingDataFlag,
  Medication,
  DietaryRestriction,
  GroceryItem,
  RedFlagSymptom,
} from './schemas.js';

/**
 * Medical jargon to plain-language translation dictionary
 */
const JARGON_TRANSLATIONS: Record<string, string> = {
  // Conditions
  myocardial_infarction: 'heart attack',
  cerebrovascular_accident: 'stroke',
  pneumonia: 'lung infection',
  gastroenteritis: 'stomach flu',
  appendicitis: 'appendix inflammation',
  cholecystitis: 'gallbladder inflammation',
  hypertension: 'high blood pressure',
  diabetes_mellitus: 'diabetes',
  hyperlipidemia: 'high cholesterol',
  atrial_fibrillation: 'irregular heartbeat',
  congestive_heart_failure: 'heart weakness',
  chronic_obstructive_pulmonary_disease: 'COPD (chronic lung disease)',
  acute_kidney_injury: 'sudden kidney problems',
  chronic_kidney_disease: 'long-term kidney disease',
  hepatic_cirrhosis: 'liver scarring',
  deep_vein_thrombosis: 'blood clot in leg',
  pulmonary_embolism: 'blood clot in lung',
  sepsis: 'severe infection in bloodstream',
  anemia: 'low red blood cells',
  thrombocytopenia: 'low platelets',

  // Procedures
  appendectomy: 'appendix removal',
  cholecystectomy: 'gallbladder removal',
  hysterectomy: 'uterus removal',
  mastectomy: 'breast removal',
  nephrectomy: 'kidney removal',
  colostomy: 'bowel opening in abdomen',
  ileostomy: 'small intestine opening in abdomen',
  tracheostomy: 'breathing tube in neck',
  catheterization: 'tube insertion into blood vessel',
  intubation: 'breathing tube down throat',
  extubation: 'removal of breathing tube',
  dialysis: 'artificial kidney treatment',
  chemotherapy: 'cancer drug treatment',
  radiation_therapy: 'cancer radiation treatment',

  // Medications
  ace_inhibitor: 'blood pressure medication',
  beta_blocker: 'heart/blood pressure medication',
  statin: 'cholesterol medication',
  anticoagulant: 'blood thinner',
  antiplatelet: 'blood thinner (aspirin-like)',
  nsaid: 'pain reliever (ibuprofen-like)',
  opioid: 'strong pain medication',
  proton_pump_inhibitor: 'stomach acid reducer',
  h2_blocker: 'stomach acid reducer',
  diuretic: 'water pill',
  corticosteroid: 'inflammation reducer',
  antibiotic: 'infection fighter',
  antiviral: 'virus fighter',
  antifungal: 'fungus fighter',
  insulin: 'diabetes medication',
  metformin: 'diabetes medication',
  sulfonylurea: 'diabetes medication',

  // Lab values
  creatinine: 'kidney function marker',
  bun: 'kidney function marker',
  egfr: 'kidney function percentage',
  ast: 'liver enzyme',
  alt: 'liver enzyme',
  bilirubin: 'liver function marker',
  albumin: 'protein level',
  hemoglobin: 'red blood cell level',
  hematocrit: 'red blood cell percentage',
  platelets: 'clotting cell count',
  wbc: 'white blood cell count',
  glucose: 'blood sugar',
  potassium: 'electrolyte level',
  sodium: 'electrolyte level',
  calcium: 'mineral level',
  magnesium: 'mineral level',
  phosphorus: 'mineral level',
  inr: 'blood clotting measure',
  ptt: 'blood clotting measure',

  // Symptoms
  dyspnea: 'shortness of breath',
  orthopnea: 'shortness of breath when lying down',
  paroxysmal_nocturnal_dyspnea: 'sudden shortness of breath at night',
  chest_pain: 'chest pain',
  palpitations: 'heart racing or fluttering',
  syncope: 'fainting',
  presyncope: 'feeling faint',
  edema: 'swelling',
  ascites: 'fluid in belly',
  hemoptysis: 'coughing up blood',
  hematuria: 'blood in urine',
  melena: 'black tarry stool',
  hematochezia: 'bright red blood in stool',
  nausea: 'feeling sick to stomach',
  vomiting: 'throwing up',
  diarrhea: 'loose stools',
  constipation: 'difficulty with bowel movements',
  abdominal_pain: 'belly pain',
  fever: 'high body temperature',
  chills: 'shaking from cold',
  diaphoresis: 'excessive sweating',
  malaise: 'general feeling of illness',
  fatigue: 'extreme tiredness',
  weakness: 'lack of strength',
  headache: 'head pain',
  dizziness: 'spinning sensation',
  vertigo: 'severe spinning sensation',
  confusion: 'difficulty thinking clearly',
  altered_mental_status: 'change in thinking or awareness',
  anxiety: 'worry or nervousness',
  depression: 'persistent sadness',
};

/**
 * Translate medical jargon to plain language
 * @param text - Medical text to translate
 * @returns Plain-language version
 */
export function translateMedicalJargon(text: string): string {
  if (!text) return text;

  let result = text.toLowerCase();

  // Replace known jargon terms
  for (const [jargon, plain] of Object.entries(JARGON_TRANSLATIONS)) {
    const regex = new RegExp(`\\b${jargon.replace(/_/g, '\\s+')}\\b`, 'gi');
    result = result.replace(regex, plain);
  }

  // Capitalize first letter of sentences
  result = result.replace(/^\w/, (c) => c.toUpperCase());
  result = result.replace(/([.!?]\s+)(\w)/g, (match, punct, letter) => punct + letter.toUpperCase());

  return result;
}

/**
 * Flag missing critical data points
 * @param data - Partial discharge data
 * @returns Array of missing data flags
 */
export function flagMissingCriticalData(data: {
  allergies?: string[];
  kidney_function?: string;
  liver_function?: string;
  medications?: Medication[];
  dietary_restrictions?: DietaryRestriction[];
}): MissingDataFlag[] {
  const flags: MissingDataFlag[] = [];

  // Check allergies
  if (!data.allergies || data.allergies.length === 0) {
    flags.push({
      field: 'allergies',
      severity: 'critical',
      message:
        'No allergies documented. This is critical for medication safety and food recommendations. Please confirm with patient.',
    });
  }

  // Check kidney function
  if (!data.kidney_function) {
    flags.push({
      field: 'kidney_function',
      severity: 'high',
      message:
        'Kidney function not documented. This affects medication dosing and dietary recommendations. Please obtain baseline creatinine or eGFR.',
    });
  }

  // Check liver function
  if (!data.liver_function) {
    flags.push({
      field: 'liver_function',
      severity: 'high',
      message:
        'Liver function not documented. This affects medication metabolism. Please obtain baseline liver enzymes if patient has risk factors.',
    });
  }

  // Check medication dosages
  if (data.medications && data.medications.length > 0) {
    const incompleteMeds = data.medications.filter((m) => !m.dosage || !m.frequency);
    if (incompleteMeds.length > 0) {
      flags.push({
        field: 'medication_dosages',
        severity: 'critical',
        message: `${incompleteMeds.length} medication(s) missing dosage or frequency information. Cannot safely coordinate delivery or create timeline.`,
      });
    }
  }

  // Check dietary restrictions
  if (!data.dietary_restrictions || data.dietary_restrictions.length === 0) {
    flags.push({
      field: 'dietary_restrictions',
      severity: 'medium',
      message:
        'No dietary restrictions documented. Confirm with patient if any restrictions apply (e.g., low-sodium, diabetic diet).',
    });
  }

  return flags;
}

/**
 * Known drug-food interactions (simplified for demo)
 */
const DRUG_FOOD_INTERACTIONS: Record<string, string[]> = {
  warfarin: ['kale', 'spinach', 'broccoli', 'cabbage', 'brussels sprouts'], // High vitamin K
  metformin: ['alcohol'], // Lactic acidosis risk
  lisinopril: ['potassium', 'bananas', 'oranges', 'coconut water'], // Hyperkalemia risk
  atorvastatin: ['grapefruit', 'grapefruit juice'], // CYP3A4 inhibition
  simvastatin: ['grapefruit', 'grapefruit juice'],
  metoprolol: ['licorice'], // Hypokalemia risk
  digoxin: ['licorice', 'potassium'], // Arrhythmia risk
  tetracycline: ['dairy', 'milk', 'cheese', 'yogurt'], // Reduced absorption
  ciprofloxacin: ['dairy', 'milk', 'cheese', 'yogurt'],
  levothyroxine: ['soy', 'calcium', 'iron'], // Reduced absorption
  aspirin: ['alcohol'], // GI bleeding risk
  ibuprofen: ['alcohol'], // GI bleeding risk
  methotrexate: ['alcohol'], // Hepatotoxicity risk
};

/**
 * Check if a food item interacts with prescribed medications
 * @param foodName - Name of food to check
 * @param medications - List of prescribed medications
 * @returns Array of interaction warnings
 */
export function checkDrugFoodInteractions(foodName: string, medications: Medication[]): string[] {
  const warnings: string[] = [];
  const foodLower = foodName.toLowerCase();

  for (const med of medications) {
    const medNameLower = med.name.toLowerCase();
    const interactingFoods = DRUG_FOOD_INTERACTIONS[medNameLower] || [];

    for (const food of interactingFoods) {
      if (foodLower.includes(food) || food.includes(foodLower)) {
        warnings.push(
          `"${med.name}" may interact with "${foodName}". Consult pharmacist before consuming.`
        );
      }
    }
  }

  return warnings;
}

/**
 * Filter grocery items by dietary restrictions and drug interactions
 * @param items - Candidate grocery items
 * @param restrictions - Dietary restrictions
 * @param medications - Prescribed medications
 * @returns Filtered and annotated grocery items
 */
export function filterGroceryItemsByRestrictions(
  items: GroceryItem[],
  restrictions: DietaryRestriction[],
  medications: Medication[]
): GroceryItem[] {
  return items
    .map((item) => {
      let safe = true;
      const warnings: string[] = [];

      // Check dietary restrictions
      for (const restriction of restrictions) {
        const restrictionLower = restriction.type.toLowerCase();

        // Low-sodium check
        if (restrictionLower.includes('low-sodium') || restrictionLower.includes('sodium')) {
          const highSodiumFoods = [
            'canned',
            'processed',
            'deli',
            'bacon',
            'ham',
            'sausage',
            'cheese',
            'pickled',
            'soy sauce',
            'salt',
          ];
          if (highSodiumFoods.some((f) => item.name.toLowerCase().includes(f))) {
            safe = false;
            warnings.push('High sodium content conflicts with low-sodium diet');
          }
        }

        // Diabetic diet check
        if (restrictionLower.includes('diabetic')) {
          const highSugarFoods = [
            'candy',
            'soda',
            'juice',
            'dessert',
            'cake',
            'cookie',
            'chocolate',
            'sugar',
            'honey',
          ];
          if (highSugarFoods.some((f) => item.name.toLowerCase().includes(f))) {
            safe = false;
            warnings.push('High sugar content conflicts with diabetic diet');
          }
        }

        // Gluten-free check
        if (restrictionLower.includes('gluten')) {
          const glutenFoods = ['bread', 'pasta', 'cereal', 'flour', 'wheat', 'barley', 'rye'];
          if (glutenFoods.some((f) => item.name.toLowerCase().includes(f))) {
            safe = false;
            warnings.push('Contains gluten; conflicts with gluten-free diet');
          }
        }

        // Liquid-only check
        if (restrictionLower.includes('liquid')) {
          const solidFoods = ['meat', 'vegetable', 'fruit', 'bread', 'cheese', 'nuts'];
          if (solidFoods.some((f) => item.name.toLowerCase().includes(f))) {
            safe = false;
            warnings.push('Solid food conflicts with liquid-only diet');
          }
        }
      }

      // Check drug-food interactions
      const drugInteractions = checkDrugFoodInteractions(item.name, medications);
      if (drugInteractions.length > 0) {
        safe = false;
        warnings.push(...drugInteractions);
      }

      return {
        ...item,
        safe_for_restrictions: safe,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    })
    .filter((item) => item.safe_for_restrictions);
}

/**
 * Red flag symptoms for emergency evaluation
 */
export const RED_FLAG_SYMPTOMS: RedFlagSymptom[] = [
  {
    symptom: 'chest pain',
    severity: 'severe',
    action: 'go_to_er',
    description: 'Chest pain or pressure may indicate heart problems',
  },
  {
    symptom: 'shortness of breath',
    severity: 'severe',
    action: 'go_to_er',
    description: 'Severe difficulty breathing requires immediate evaluation',
  },
  {
    symptom: 'severe bleeding',
    severity: 'severe',
    action: 'go_to_er',
    description: 'Uncontrolled bleeding is a medical emergency',
  },
  {
    symptom: 'loss of consciousness',
    severity: 'severe',
    action: 'go_to_er',
    description: 'Fainting or unconsciousness requires emergency care',
  },
  {
    symptom: 'severe allergic reaction',
    severity: 'severe',
    action: 'go_to_er',
    description: 'Difficulty breathing, swelling, or anaphylaxis is life-threatening',
  },
  {
    symptom: 'high fever',
    severity: 'moderate',
    action: 'call_doctor',
    description: 'Fever above 101°F (38.3°C) may indicate infection',
  },
  {
    symptom: 'severe pain',
    severity: 'moderate',
    action: 'call_doctor',
    description: 'Pain not controlled by prescribed medication needs evaluation',
  },
  {
    symptom: 'wound infection',
    severity: 'moderate',
    action: 'call_doctor',
    description: 'Signs of infection (redness, warmth, pus, increasing pain) need treatment',
  },
  {
    symptom: 'persistent vomiting',
    severity: 'moderate',
    action: 'call_doctor',
    description: 'Vomiting lasting more than a few hours needs evaluation',
  },
  {
    symptom: 'inability to take medications',
    severity: 'moderate',
    action: 'call_doctor',
    description: 'Cannot keep down prescribed medications needs guidance',
  },
  {
    symptom: 'mild fever',
    severity: 'mild',
    action: 'rest',
    description: 'Low-grade fever (under 101°F) often resolves with rest and fluids',
  },
  {
    symptom: 'mild nausea',
    severity: 'mild',
    action: 'rest',
    description: 'Mild nausea can often be managed at home with rest and clear fluids',
  },
  {
    symptom: 'mild headache',
    severity: 'mild',
    action: 'rest',
    description: 'Mild headache can be managed with rest and over-the-counter pain relief',
  },
  {
    symptom: 'fatigue',
    severity: 'mild',
    action: 'rest',
    description: 'Fatigue is normal during recovery; rest and hydration help',
  },
];

/**
 * Evaluate reported symptoms against red flags
 * @param symptoms - Array of reported symptoms
 * @returns Recommendation and reasoning
 */
export function evaluateSymptoms(symptoms: string[]): {
  recommendation: 'rest' | 'call_doctor' | 'go_to_er';
  reasoning: string;
  red_flags_detected: string[];
} {
  const symptomsLower = symptoms.map((s) => s.toLowerCase());
  const detectedFlags: RedFlagSymptom[] = [];

  // Check each symptom against red flags
  for (const symptom of symptomsLower) {
    for (const flag of RED_FLAG_SYMPTOMS) {
      if (symptom.includes(flag.symptom) || flag.symptom.includes(symptom)) {
        detectedFlags.push(flag);
        break;
      }
    }
  }

  // Determine recommendation based on severity
  if (detectedFlags.some((f) => f.action === 'go_to_er')) {
    return {
      recommendation: 'go_to_er',
      reasoning:
        'One or more symptoms suggest a medical emergency. Go to the nearest emergency room or call 911.',
      red_flags_detected: detectedFlags.filter((f) => f.action === 'go_to_er').map((f) => f.symptom),
    };
  }

  if (detectedFlags.some((f) => f.action === 'call_doctor')) {
    return {
      recommendation: 'call_doctor',
      reasoning:
        'One or more symptoms warrant professional evaluation. Call your doctor or nurse hotline.',
      red_flags_detected: detectedFlags.filter((f) => f.action === 'call_doctor').map((f) => f.symptom),
    };
  }

  return {
    recommendation: 'rest',
    reasoning:
      'Your symptoms appear to be normal for recovery. Rest, stay hydrated, and follow your discharge instructions. Monitor for any changes.',
    red_flags_detected: [],
  };
}
