/**
 * ============================================================================
 * ONCOBYTE DATA STRUCTURES & DOMAIN MODELS (src/types/oncobyte.ts)
 * ============================================================================
 * Purpose:
 *   Centralized TypeScript interfaces defining the core data structures used
 *   across the Express backend, the DSA analytics/recommendation engines,
 *   the React Native iOS SDK, and the Frontend UI.
 *
 * Tasks Covered in this File:
 *   - TASK 3:  Meal Details (Food names, ingredients, portions, timestamps)
 *   - TASK 6:  Food Tolerance Logging (ToleranceLevel enum & records)
 *   - TASK 14: Symptom Database (Structured list of oncology nutrition symptoms)
 *   - TASK 26: Recipe Database Design (Schemas for recipes, ingredients, metadata)
 *   - TASK 46: Food Safety Resource Database (Structured safety guidelines)
 *   - TASK 62: OncoByte Database Design (Unified schemas for all collections)
 *   - TASK 64: OncoByte User Profiles (Preferences, restrictions, allergies)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// TASK 2 & TASK 6: Meal Category & Food Tolerance Enumerations
// ----------------------------------------------------------------------------
export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type ToleranceLevel = 'Well Tolerated' | 'Moderate' | 'Difficult' | 'Not Tolerated';
export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

// ----------------------------------------------------------------------------
// TASK 1, TASK 3, TASK 6, TASK 8: MealEntry Data Structure
// Stores individual meal/snack records, normalized ingredient arrays for O(1)
// hash-map lookup, portion descriptions, timestamps, and gentle nutrition info.
// ----------------------------------------------------------------------------
export interface MealEntry {
  id: string;
  userId: string;
  date: string; // ISO Date Format: YYYY-MM-DD (Indexed for binary/range search)
  timestamp: string; // 24-Hour Time Format: HH:mm (Used for chronological sorting)
  category: MealCategory;
  foodName: string;
  ingredients: string[]; // Tokenized ingredient array for tolerance correlation DSA
  portion: string;
  tolerance: ToleranceLevel;
  notes?: string;
  isCustomFood?: boolean; // TASK 8: Custom Food Entries flag
  nutritionInfo?: {
    proteinG?: number;
    fiberG?: number;
    ironMg?: number;
    potassiumMg?: number;
    gentleSummary?: string; // TASK 45: Non-calorie-obsessed supportive nutrition display
  };
}

// ----------------------------------------------------------------------------
// TASK 4 & TASK 5: HydrationEntry Data Structure
// Stores fluid intake volumes (in milliliters) and beverage categories.
// ----------------------------------------------------------------------------
export interface HydrationEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:mm
  fluidType:
    | 'Water'
    | 'Electrolyte Solution'
    | 'Ginger Tea'
    | 'Clear Broth'
    | 'Bone Broth'
    | 'Herbal Tea'
    | 'Fruit Smoothie';
  amountMl: number;
  tolerance: ToleranceLevel;
  notes?: string;
}

// ----------------------------------------------------------------------------
// TASK 14, TASK 15, TASK 16, TASK 17: SymptomEntry Data Structure
// Structured oncology nutrition symptom taxonomy, severity rating (1-5),
// appetite score (1-10), and swallowing/eating difficulty categorization.
// ----------------------------------------------------------------------------
export interface SymptomEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:mm
  symptomType:
    | 'Nausea'
    | 'Fatigue'
    | 'Taste Changes (Metallic/Bitter)'
    | 'Appetite Loss'
    | 'Swallowing Difficulty (Dysphagia)'
    | 'Dry Mouth (Xerostomia)'
    | 'Mouth Sores (Mucositis)'
    | 'Early Satiety'
    | 'Food Aversion'
    | 'Gastrointestinal Discomfort';
  category: 'Symptom' | 'Eating Difficulty' | 'Quick Entry';
  severity: SeverityLevel; // 1 (Mild) to 5 (Severe)
  appetiteScore: number; // TASK 16: 1 (Very Low) to 10 (Strong Appetite)
  triggeredByFood?: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// TASK 18: FoodSensitivityRecord Data Structure
// Tracks recurring food aversions or intolerances to feed the Inverted Index
// inside the Recipe Recommendation Engine (Task 39 & Task 40).
// ----------------------------------------------------------------------------
export interface FoodSensitivityRecord {
  id: string;
  foodOrIngredient: string;
  reactionType:
    | 'Aversion'
    | 'Nausea Trigger'
    | 'Texture Difficulty'
    | 'Mouth Irritation'
    | 'GI Intolerance';
  toleranceStatus: 'Avoid' | 'Caution' | 'Well Tolerated';
  occurrenceCount: number;
  lastReported: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// TASK 43 & TASK 44: USDAFoodNutrient Data Structure
// Standardized nutrient schema mapped from USDA FoodData Central FDC records.
// ----------------------------------------------------------------------------
export interface USDAFoodNutrient {
  fdcId: string;
  name: string;
  category: string;
  servingSize: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  ironMg: number;
  calciumMg: number;
  potassiumMg: number;
  clinicalNote: string;
}

// ----------------------------------------------------------------------------
// TASK 26, TASK 30, TASK 31, TASK 48: Recipe Data Structure
// Includes raw & normalized ingredient tokens, texture classifications for
// dysphagia, allergens, food safety warnings, and verified source attribution.
// ----------------------------------------------------------------------------
export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  category:
    | 'High-Protein Gentle'
    | 'Soothing & Hydrating'
    | 'Soft Texture / Dysphagia-Friendly'
    | 'Nausea-Calming'
    | 'Nutrient-Dense Snack';
  textureProfile:
    | 'Smooth / Pureed'
    | 'Soft & Moist'
    | 'Clear Liquid'
    | 'Lightly Crisp'
    | 'Room Temperature';
  ingredients: {
    rawText: string;
    normalizedName: string; // TASK 31: Canonical ingredient name for cross-recipe matching
    amount: string;
    unit: string;
  }[];
  instructions: string[];
  dietaryTags: string[];
  allergens: string[];
  foodSafetyWarnings: string[]; // TASK 47: Treatment-specific safety warnings
  treatmentConsiderations: string[];
  sourceName: string;
  sourceUrl: string;
  sourceVerified: boolean; // TASK 48: Recipe Source Verification flag
  isCustom?: boolean; // TASK 38: Custom Recipe Submission flag
  nutritionHighlight: {
    proteinG: number;
    fiberG: number;
    hydrationSupport: 'High' | 'Moderate' | 'Standard';
    gentleDigestibilityNote: string;
  };
}

// ----------------------------------------------------------------------------
// TASK 39, TASK 40, TASK 42: RecipeRecommendation Data Structure
// Output of the Weighted Multi-Factor Scoring Algorithm, pairing each recipe
// with a deterministic matchScore [25..99], positive explanations, and caution flags.
// ----------------------------------------------------------------------------
export interface RecipeRecommendation {
  recipe: Recipe;
  matchScore: number;
  reasons: string[];
  cautionIngredients: {
    ingredient: string;
    reason: string;
  }[];
}

// ----------------------------------------------------------------------------
// TASK 37: RecipeCollection Data Structure
// Allows patients to group bookmarked recipes into custom folders/collections.
// ----------------------------------------------------------------------------
export interface RecipeCollection {
  id: string;
  name: string;
  description: string;
  recipeIds: string[];
}

// ----------------------------------------------------------------------------
// TASK 46 & TASK 47: FoodSafetyResource Data Structure
// Structured oncology food safety guidelines (Neutropenic precautions, temps).
// ----------------------------------------------------------------------------
export interface FoodSafetyResource {
  id: string;
  title: string;
  category:
    | 'Neutropenic Precautions'
    | 'Safe Cooking Temperatures'
    | 'Cross-Contamination Prevention'
    | 'Symptom-Targeted Eating'
    | 'Professional Guidance';
  riskLevel: 'Critical Safety' | 'Important Precaution' | 'Helpful Guidance';
  summary: string;
  avoidList: string[];
  safeAlternatives: string[];
  clinicalSource: string;
  sourceUrl: string;
}

// ----------------------------------------------------------------------------
// TASK 59: CaregiverAccessGrant Data Structure
// Role-based access control (RBAC) record for authorized family caregivers.
// ----------------------------------------------------------------------------
export interface CaregiverAccessGrant {
  id: string;
  caregiverName: string;
  caregiverEmail: string;
  relationship: string;
  accessCode: string;
  permissions: {
    viewMeals: boolean;
    viewHydration: boolean;
    viewSymptoms: boolean;
    exportReports: boolean;
  };
  status: 'Active' | 'Revoked';
  createdAt: string;
  expiresAt: string;
}

// ----------------------------------------------------------------------------
// TASK 12, TASK 13, TASK 64: UserProfile Data Structure
// Stores user profile, allergies, neutropenic status, reminders, and UI prefs.
// ----------------------------------------------------------------------------
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  treatmentContext: string;
  neutropenicDietActive: boolean;
  dailyHydrationGoalMl: number;
  allergies: string[];
  dietaryRestrictions: string[];
  loggingPreferences: {
    // TASK 13: Logging Preferences customization flags
    showMealJournal: boolean;
    showHydration: boolean;
    showSymptoms: boolean;
    showAppetiteScore: boolean;
    showToleranceRatings: boolean;
    showGentleNutritionMetrics: boolean;
  };
  reminders: {
    // TASK 12: Optional Meal & Hydration Reminders
    id: string;
    label: string;
    time: string;
    type: 'Meal' | 'Hydration';
    enabled: boolean;
  }[];
  savedRecipeIds: string[]; // TASK 36: Saved Recipes bookmarks
}

// ----------------------------------------------------------------------------
// TASK 20, TASK 21, TASK 22, TASK 51, TASK 52: AnalyticsSummary Data Structure
// Output of the Time-Series & Observational Correlation DSA Module.
// ----------------------------------------------------------------------------
export interface AnalyticsSummary {
  dateRange: { start: string; end: string };
  totalMeals: number;
  averageDailyHydrationMl: number;
  hydrationGoalCompletionPct: number;
  averageAppetiteScore: number;
  toleranceBreakdown: {
    wellTolerated: number;
    moderate: number;
    difficult: number;
    notTolerated: number;
  };
  symptomFrequency: {
    symptom: string;
    count: number;
    avgSeverity: number;
  }[];
  tolerancePatterns: {
    ingredientOrFood: string;
    wellToleratedCount: number;
    difficultCount: number;
    observationNote: string;
  }[];
  dailyTimeline: {
    date: string;
    mealCount: number;
    hydrationMl: number;
    avgAppetite: number;
    avgSymptomSeverity: number;
  }[];
}
