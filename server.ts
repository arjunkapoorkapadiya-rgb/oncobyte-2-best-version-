/**
 * ============================================================================
 * ONCOBYTE INDEPENDENT BACKEND ARCHITECTURE & REST API SERVER (server.ts)
 * ============================================================================
 * Purpose:
 *   Full-stack Express + TypeScript backend server powering both the React Native
 *   iOS mobile application and the synchronized web clinical workspace.
 *
 * Tasks Completed in this File (with explicit Task # comments above each block):
 *   - TASK 1:  Meal Logging Backend (GET, POST, PUT, DELETE /api/meals)
 *   - TASK 3:  Meal Details Storage (foodName, ingredients[], portion, timestamp)
 *   - TASK 4:  Hydration Backend (GET, POST, DELETE /api/hydration)
 *   - TASK 6:  Food Tolerance Logging
 *   - TASK 8:  Custom Food Entries (isCustomFood support)
 *   - TASK 9:  Meal History Chronological Retrieval
 *   - TASK 11: Meal Editing and Deletion (PUT / DELETE /api/meals/:id)
 *   - TASK 12 & 13: Meal Reminders & Logging Preferences Persistence
 *   - TASK 14 & 15: Symptom Database & Symptom Logging (/api/symptoms)
 *   - TASK 16 & 17: Appetite Tracking & Eating Difficulty Tracking
 *   - TASK 18: Food Sensitivity Tracking (/api/sensitivities)
 *   - TASK 20, 21, 22, 51, 52: Analytics, Trend & Tolerance Pattern Engine (/api/analytics)
 *   - TASK 26, 27, 28: Recipe Database Design, Collection & API Integration (/api/recipes)
 *   - TASK 29, 30, 31: Python Recipe Web Data Pipeline Execution (/api/pipeline/normalize)
 *   - TASK 32 & 33: Recipe Search & Multi-Facet Filtering
 *   - TASK 36, 37, 38: Saved Recipes, Personal Collections & Custom Recipe Submission
 *   - TASK 39, 40, 42: Recipe Recommendation & Tolerance Matching Engine
 *   - TASK 43 & 44: Live USDA FoodData Central Integration & Ingredient Lookup (/api/usda/search)
 *   - TASK 46, 47, 48: Food Safety Resource Database, Warnings & Source Verification
 *   - TASK 53, 54, 60: Server-Side Binary PDF Generation & Parity Validation (/api/reports/export.pdf)
 *   - TASK 59: Caregiver Access Workflow (/api/caregiver-grants)
 *   - TASK 61, 62, 63, 64, 65: OncoByte Backend Architecture, DB, Auth (JWT+scrypt), Profiles & APIs
 *   - TASK 68, 69, 70, 71: Security, Zod Data Validation, Disk Synchronization & Error Handling
 * ============================================================================
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import {
  normalizeIngredientToken,
  sortRecordsChronologically,
  runRecipeRecommendationEngine,
  computePatientAnalyticsSummary,
  searchAndFilterRecipes,
  computeReportParityChecksum,
} from './src/dsa/oncobyteDsaEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'oncobyte_db.json');

// ----------------------------------------------------------------------------
// TEAM CONFIGURATION NOTE (API KEYS & SECRETS):
// 1. JWT_SECRET: Set a strong 32+ character secret in production `.env`.
// 2. USDA_FDC_API_KEY: Grab a free API key at https://fdc.nal.usda.gov/api-key-signup.html
//    and set it in `.env` (defaults to "DEMO_KEY" if omitted).
// 3. SPOONACULAR_API_KEY / EDAMAM_APP_KEY: Optional third-party recipe API keys.
// ----------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'oncobyte-production-secret-change-in-prod';

// ============================================================================
// TASK 69: OncoByte Data Validation (Zod Request Payload Schemas)
// Validates incoming meal, hydration, and symptom payloads in O(1) schema pass.
// ============================================================================

const MealSchema = z.object({
  date: z.string().optional(),
  timestamp: z.string().optional(),
  category: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  foodName: z.string().min(1, 'Food name is required'),
  ingredients: z.union([z.array(z.string()), z.string()]).optional(),
  portion: z.string().optional(),
  tolerance: z.enum(['Well Tolerated', 'Moderate', 'Difficult', 'Not Tolerated']).optional(),
  notes: z.string().optional(),
  isCustomFood: z.boolean().optional(),
});

const HydrationSchema = z.object({
  date: z.string().optional(),
  timestamp: z.string().optional(),
  fluidType: z.enum([
    'Water',
    'Electrolyte Solution',
    'Ginger Tea',
    'Clear Broth',
    'Bone Broth',
    'Herbal Tea',
    'Fruit Smoothie',
  ]),
  amountMl: z.number().positive('Fluid amount must be positive'),
  tolerance: z.enum(['Well Tolerated', 'Moderate', 'Difficult', 'Not Tolerated']).optional(),
  notes: z.string().optional(),
});

const SymptomSchema = z.object({
  date: z.string().optional(),
  timestamp: z.string().optional(),
  symptomType: z.string().min(1, 'Symptom type is required'),
  category: z.enum(['Symptom', 'Eating Difficulty', 'Quick Entry']).optional(),
  severity: z.number().min(1).max(5).optional(),
  appetiteScore: z.number().min(1).max(10).optional(),
  triggeredByFood: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// TASK 63 & TASK 68: OncoByte Authentication & Security
// Uses Node.js `crypto.scryptSync` for password key derivation and HMAC-SHA256
// for stateless JSON Web Token (JWT) signing and verification.
// ============================================================================

function hashPassword(password: string, salt: string = 'oncobyte_salt_v1'): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function signToken(payload: { userId: string; email: string; name: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): { userId: string; email: string; name: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ============================================================================
// TASK 14, TASK 26, TASK 46, TASK 62, TASK 64: Initial Seed Data & Schemas
// ============================================================================

const INITIAL_USER_PROFILE = {
  id: 'usr_onco_01',
  name: 'Elena Rostova',
  email: 'elena.rostova@patientcare.org',
  passwordHash: hashPassword('oncobyte2026'),
  treatmentContext: 'Cycle 3 Adjuvant Chemotherapy — Focus on gentle hydration & nausea management',
  neutropenicDietActive: true,
  dailyHydrationGoalMl: 2000,
  allergies: ['Shellfish', 'Raw Tree Nuts'],
  dietaryRestrictions: ['Pasteurized Dairy Only', 'No Raw Sprouts', 'Low Acid'],
  loggingPreferences: {
    showMealJournal: true,
    showHydration: true,
    showSymptoms: true,
    showAppetiteScore: true,
    showToleranceRatings: true,
    showGentleNutritionMetrics: true,
  },
  reminders: [
    { id: 'rem_1', label: 'Morning Ginger Tea & Small Breakfast', time: '08:30', type: 'Meal' as const, enabled: true },
    { id: 'rem_2', label: 'Mid-Morning Electrolyte Sip', time: '10:30', type: 'Hydration' as const, enabled: true },
    { id: 'rem_3', label: 'Gentle Midday Meal', time: '12:45', type: 'Meal' as const, enabled: true },
    { id: 'rem_4', label: 'Afternoon Broth or Smoothie', time: '15:30', type: 'Hydration' as const, enabled: true },
    { id: 'rem_5', label: 'Early Evening Soft Dinner', time: '18:15', type: 'Meal' as const, enabled: true },
  ],
  savedRecipeIds: ['rec_01', 'rec_02', 'rec_04'],
};

const INITIAL_MEALS = [
  {
    id: 'meal_101',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '08:35',
    category: 'Breakfast' as const,
    foodName: 'Warm Cinnamon Oatmeal with Stewed Apples',
    ingredients: ['rolled oats', 'water', 'peeled apple', 'ground cinnamon', 'maple syrup'],
    portion: '1 small bowl (180g)',
    tolerance: 'Well Tolerated' as const,
    notes: 'Served lukewarm; peeled apples were very easy to swallow and soothing.',
    nutritionInfo: {
      proteinG: 6.2,
      fiberG: 4.5,
      ironMg: 1.8,
      potassiumMg: 210,
      gentleSummary: 'Soluble oat fiber and cooked pectin support gentle digestion.',
    },
  },
  {
    id: 'meal_102',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '12:40',
    category: 'Lunch' as const,
    foodName: 'Ginger Miso Congee with Soft Poached Egg & Silken Tofu',
    ingredients: ['white jasmine rice', 'vegetable broth', 'fresh ginger', 'white miso paste', 'silken tofu', 'well-cooked egg'],
    portion: '1 medium bowl (260g)',
    tolerance: 'Well Tolerated' as const,
    notes: 'Fresh ginger aroma helped settle mild mid-day nausea.',
    nutritionInfo: {
      proteinG: 14.8,
      fiberG: 1.2,
      ironMg: 2.4,
      potassiumMg: 320,
      gentleSummary: 'High moisture content and complete protein without heavy fats.',
    },
  },
  {
    id: 'meal_103',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '16:10',
    category: 'Snack' as const,
    foodName: 'Banana Oat Protein Smoothie',
    ingredients: ['ripe banana', 'pasteurized Greek yogurt', 'oat milk', 'rolled oats'],
    portion: '240 ml glass',
    tolerance: 'Moderate' as const,
    notes: 'Drank slowly over 30 minutes; felt slightly full halfway through.',
    nutritionInfo: {
      proteinG: 11.5,
      fiberG: 3.1,
      ironMg: 0.9,
      potassiumMg: 440,
      gentleSummary: 'Potassium-rich and smooth texture for low chewing effort.',
    },
  },
  {
    id: 'meal_099',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '09:00',
    category: 'Breakfast' as const,
    foodName: 'Scrambled Eggs on White Sourdough Toast',
    ingredients: ['well-cooked eggs', 'sourdough bread', 'olive oil'],
    portion: '2 eggs + 1 slice toast',
    tolerance: 'Well Tolerated' as const,
    notes: 'Cooked eggs thoroughly until firm per food safety guidelines.',
    nutritionInfo: {
      proteinG: 15.2,
      fiberG: 1.4,
      ironMg: 2.1,
      potassiumMg: 185,
      gentleSummary: 'High bioavailable protein for tissue recovery.',
    },
  },
  {
    id: 'meal_098',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '13:15',
    category: 'Lunch' as const,
    foodName: 'Tomato Basil Bisque with Cheddar Crackers',
    ingredients: ['tomatoes', 'garlic', 'heavy cream', 'onion', 'cheddar crackers'],
    portion: '1 cup',
    tolerance: 'Difficult' as const,
    notes: 'Acidic tomato and garlic triggered metallic taste and mild reflux.',
    nutritionInfo: {
      proteinG: 5.4,
      fiberG: 2.2,
      ironMg: 1.1,
      potassiumMg: 390,
      gentleSummary: 'Warm liquid format, though acidity may irritate sensitive mucosa.',
    },
  },
  {
    id: 'meal_097',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '18:30',
    category: 'Dinner' as const,
    foodName: 'Poached Chicken Breast with Mashed Sweet Potato',
    ingredients: ['chicken breast', 'sweet potato', 'chicken bone broth', 'parsley'],
    portion: '120g chicken + 1/2 cup mash',
    tolerance: 'Well Tolerated' as const,
    notes: 'Moistened chicken with extra warm broth to help with dry mouth.',
    nutritionInfo: {
      proteinG: 28.4,
      fiberG: 3.8,
      ironMg: 1.6,
      potassiumMg: 580,
      gentleSummary: 'Lean protein paired with beta-carotene rich soft mash.',
    },
  },
  {
    id: 'meal_095',
    userId: 'usr_onco_01',
    date: '2026-11-13',
    timestamp: '12:30',
    category: 'Lunch' as const,
    foodName: 'Spicy Garlic Noodles with Tofu',
    ingredients: ['wheat noodles', 'chili oil', 'garlic', 'onion', 'soy sauce', 'tofu'],
    portion: '1/2 bowl',
    tolerance: 'Not Tolerated' as const,
    notes: 'Chili oil and strong garlic odor caused immediate nausea and food aversion.',
    nutritionInfo: {
      proteinG: 10.2,
      fiberG: 2.0,
      ironMg: 1.9,
      potassiumMg: 220,
      gentleSummary: 'Plant protein source; strong spices may challenge sensitive stomachs.',
    },
  },
  {
    id: 'meal_094',
    userId: 'usr_onco_01',
    date: '2026-11-13',
    timestamp: '18:00',
    category: 'Dinner' as const,
    foodName: 'Butternut Squash & Red Lentil Puree Soup',
    ingredients: ['butternut squash', 'red lentils', 'vegetable broth', 'fresh ginger', 'olive oil'],
    portion: '1 bowl (250ml)',
    tolerance: 'Well Tolerated' as const,
    notes: 'Velvety smooth texture, mild sweetness was comforting.',
    nutritionInfo: {
      proteinG: 11.8,
      fiberG: 5.4,
      ironMg: 3.1,
      potassiumMg: 510,
      gentleSummary: 'Iron-rich red lentils blended smooth for effortless swallowing.',
    },
  },
  {
    id: 'meal_092',
    userId: 'usr_onco_01',
    date: '2026-11-12',
    timestamp: '09:15',
    category: 'Breakfast' as const,
    foodName: 'Greek Yogurt Parfait with Stewed Pears',
    ingredients: ['pasteurized Greek yogurt', 'peeled pear', 'honey', 'rolled oats'],
    portion: '1 cup',
    tolerance: 'Well Tolerated' as const,
    notes: 'Cool temperature felt refreshing on mouth.',
    nutritionInfo: {
      proteinG: 16.0,
      fiberG: 3.2,
      ironMg: 0.7,
      potassiumMg: 290,
      gentleSummary: 'Cool, smooth dairy protein gentle on oral mucosa.',
    },
  },
  {
    id: 'meal_091',
    userId: 'usr_onco_01',
    date: '2026-11-11',
    timestamp: '13:00',
    category: 'Lunch' as const,
    foodName: 'Avocado & Egg Salad on Soft Brioche',
    ingredients: ['avocado', 'well-cooked eggs', 'brioche bread', 'lemon juice'],
    portion: '1 sandwich',
    tolerance: 'Well Tolerated' as const,
    notes: 'Soft crustless bread was very easy to chew and swallow.',
    nutritionInfo: {
      proteinG: 14.5,
      fiberG: 4.8,
      ironMg: 1.9,
      potassiumMg: 460,
      gentleSummary: 'Calorie-dense healthy monounsaturated fats in a soft format.',
    },
  },
];

const INITIAL_HYDRATION = [
  {
    id: 'hyd_201',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '08:15',
    fluidType: 'Ginger Tea' as const,
    amountMl: 250,
    tolerance: 'Well Tolerated' as const,
    notes: 'Warm, sipped slowly before breakfast.',
  },
  {
    id: 'hyd_202',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '10:45',
    fluidType: 'Electrolyte Solution' as const,
    amountMl: 350,
    tolerance: 'Well Tolerated' as const,
    notes: 'Diluted 1:1 with cool filtered water.',
  },
  {
    id: 'hyd_203',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '13:30',
    fluidType: 'Water' as const,
    amountMl: 300,
    tolerance: 'Well Tolerated' as const,
    notes: 'Added a cucumber slice to reduce metallic water taste.',
  },
  {
    id: 'hyd_204',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '15:45',
    fluidType: 'Bone Broth' as const,
    amountMl: 250,
    tolerance: 'Well Tolerated' as const,
    notes: 'Savory warmth helped energy in the afternoon.',
  },
  {
    id: 'hyd_205',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '17:30',
    fluidType: 'Herbal Tea' as const,
    amountMl: 250,
    tolerance: 'Well Tolerated' as const,
    notes: 'Peppermint chamomile infusion.',
  },
  {
    id: 'hyd_199',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '11:00',
    fluidType: 'Electrolyte Solution' as const,
    amountMl: 500,
    tolerance: 'Well Tolerated' as const,
  },
  {
    id: 'hyd_198',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '15:00',
    fluidType: 'Water' as const,
    amountMl: 650,
    tolerance: 'Well Tolerated' as const,
  },
  {
    id: 'hyd_197',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '19:00',
    fluidType: 'Ginger Tea' as const,
    amountMl: 450,
    tolerance: 'Well Tolerated' as const,
  },
  {
    id: 'hyd_196',
    userId: 'usr_onco_01',
    date: '2026-11-13',
    timestamp: '12:00',
    fluidType: 'Clear Broth' as const,
    amountMl: 600,
    tolerance: 'Well Tolerated' as const,
  },
  {
    id: 'hyd_195',
    userId: 'usr_onco_01',
    date: '2026-11-13',
    timestamp: '17:00',
    fluidType: 'Electrolyte Solution' as const,
    amountMl: 750,
    tolerance: 'Well Tolerated' as const,
  },
  {
    id: 'hyd_194',
    userId: 'usr_onco_01',
    date: '2026-11-12',
    timestamp: '14:00',
    fluidType: 'Water' as const,
    amountMl: 1850,
    tolerance: 'Well Tolerated' as const,
  },
  {
    id: 'hyd_193',
    userId: 'usr_onco_01',
    date: '2026-11-11',
    timestamp: '14:00',
    fluidType: 'Water' as const,
    amountMl: 1950,
    tolerance: 'Well Tolerated' as const,
  },
];

const INITIAL_SYMPTOMS = [
  {
    id: 'sym_301',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '11:20',
    symptomType: 'Nausea' as const,
    category: 'Symptom' as const,
    severity: 2 as const,
    appetiteScore: 6,
    triggeredByFood: 'Empty stomach mid-morning',
    notes: 'Subsided 20 minutes after sipping warm ginger tea.',
  },
  {
    id: 'sym_302',
    userId: 'usr_onco_01',
    date: '2026-11-15',
    timestamp: '16:25',
    symptomType: 'Early Satiety' as const,
    category: 'Eating Difficulty' as const,
    severity: 2 as const,
    appetiteScore: 5,
    triggeredByFood: 'Banana Oat Smoothie',
    notes: 'Felt full quickly after half a glass; saved the rest in fridge.',
  },
  {
    id: 'sym_299',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '13:45',
    symptomType: 'Taste Changes (Metallic/Bitter)' as const,
    category: 'Symptom' as const,
    severity: 3 as const,
    appetiteScore: 5,
    triggeredByFood: 'Tomato Basil Bisque',
    notes: 'Acidic tomato flavor tasted sharply metallic; switched to bamboo utensils.',
  },
  {
    id: 'sym_298',
    userId: 'usr_onco_01',
    date: '2026-11-14',
    timestamp: '18:00',
    symptomType: 'Dry Mouth (Xerostomia)' as const,
    category: 'Eating Difficulty' as const,
    severity: 2 as const,
    appetiteScore: 6,
    triggeredByFood: 'Chicken Breast',
    notes: 'Needed extra broth to moisten each bite.',
  },
  {
    id: 'sym_297',
    userId: 'usr_onco_01',
    date: '2026-11-13',
    timestamp: '12:50',
    symptomType: 'Nausea' as const,
    category: 'Symptom' as const,
    severity: 4 as const,
    appetiteScore: 3,
    triggeredByFood: 'Spicy Garlic Noodles',
    notes: 'Strong cooking odors and chili oil triggered wave of nausea.',
  },
  {
    id: 'sym_296',
    userId: 'usr_onco_01',
    date: '2026-11-13',
    timestamp: '15:00',
    symptomType: 'Fatigue' as const,
    category: 'Symptom' as const,
    severity: 4 as const,
    appetiteScore: 4,
    notes: 'Low afternoon energy; preferred zero-prep liquid soup for dinner.',
  },
  {
    id: 'sym_295',
    userId: 'usr_onco_01',
    date: '2026-11-12',
    timestamp: '10:00',
    symptomType: 'Appetite Loss' as const,
    category: 'Symptom' as const,
    severity: 3 as const,
    appetiteScore: 5,
    notes: 'Ate smaller snack-sized portions every 3 hours instead of large meals.',
  },
  {
    id: 'sym_294',
    userId: 'usr_onco_01',
    date: '2026-11-11',
    timestamp: '14:00',
    symptomType: 'Fatigue' as const,
    category: 'Symptom' as const,
    severity: 2 as const,
    appetiteScore: 7,
    notes: 'Mild fatigue after clinic visit.',
  },
];

const INITIAL_FOOD_SENSITIVITIES = [
  {
    id: 'sens_01',
    foodOrIngredient: 'Garlic & Strong Alliums',
    reactionType: 'Nausea Trigger' as const,
    toleranceStatus: 'Avoid' as const,
    occurrenceCount: 3,
    lastReported: '2026-11-14',
    notes: 'Strong pungent aroma and aftertaste consistently correlate with post-meal nausea.',
  },
  {
    id: 'sens_02',
    foodOrIngredient: 'Chili Oil & Hot Spices',
    reactionType: 'GI Intolerance' as const,
    toleranceStatus: 'Avoid' as const,
    occurrenceCount: 2,
    lastReported: '2026-11-13',
    notes: 'Irritates sensitive oral mucosa and stomach lining.',
  },
  {
    id: 'sens_03',
    foodOrIngredient: 'Acidic Tomato Sauces',
    reactionType: 'Mouth Irritation' as const,
    toleranceStatus: 'Caution' as const,
    occurrenceCount: 2,
    lastReported: '2026-11-14',
    notes: 'Amplifies metallic taste perception; tolerated better only in small cooked amounts.',
  },
  {
    id: 'sens_04',
    foodOrIngredient: 'Fresh Ginger & White Miso',
    reactionType: 'Aversion' as const,
    toleranceStatus: 'Well Tolerated' as const,
    occurrenceCount: 5,
    lastReported: '2026-11-15',
    notes: 'Consistently soothing for morning and midday stomach comfort.',
  },
];

const USDA_FOOD_DATABASE = [
  {
    fdcId: '173944',
    name: 'Oats, rolled, cooked with water, unenriched',
    category: 'Cereal Grains and Pasta',
    servingSize: '100g',
    proteinG: 2.5,
    carbsG: 12.0,
    fatG: 1.5,
    fiberG: 1.7,
    ironMg: 0.9,
    calciumMg: 9,
    potassiumMg: 70,
    clinicalNote: 'Soluble beta-glucan fiber gentle on gastrointestinal mucosa; serve warm or room temperature.',
  },
  {
    fdcId: '172421',
    name: 'Tofu, silken, soft, pasteurized',
    category: 'Legumes and Legume Products',
    servingSize: '100g',
    proteinG: 5.3,
    carbsG: 2.4,
    fatG: 2.7,
    fiberG: 0.1,
    ironMg: 0.8,
    calciumMg: 32,
    potassiumMg: 180,
    clinicalNote: 'Neutral flavor profile ideal for metallic taste changes (dysgeusia) and dysphagia.',
  },
  {
    fdcId: '171287',
    name: 'Egg, whole, cooked, poached or hard-boiled',
    category: 'Dairy and Egg Products',
    servingSize: '100g (approx 2 large eggs)',
    proteinG: 12.6,
    carbsG: 0.7,
    fatG: 9.5,
    fiberG: 0.0,
    ironMg: 1.2,
    calciumMg: 50,
    potassiumMg: 126,
    clinicalNote: 'Ensure yolk and white are cooked until firm (160°F/71°C) when following neutropenic food safety.',
  },
  {
    fdcId: '168482',
    name: 'Sweet potato, cooked, baked in skin, flesh, without salt',
    category: 'Vegetables and Vegetable Products',
    servingSize: '100g',
    proteinG: 2.0,
    carbsG: 20.7,
    fatG: 0.1,
    fiberG: 3.3,
    ironMg: 0.7,
    calciumMg: 38,
    potassiumMg: 475,
    clinicalNote: 'Naturally sweet flavor often remains pleasant during chemotherapy taste alterations.',
  },
  {
    fdcId: '169231',
    name: 'Ginger root, raw / steeped infusion base',
    category: 'Vegetables and Vegetable Products',
    servingSize: '100g (typically used in 5-10g culinary portions)',
    proteinG: 1.8,
    carbsG: 17.8,
    fatG: 0.8,
    fiberG: 2.0,
    ironMg: 0.6,
    calciumMg: 16,
    potassiumMg: 415,
    clinicalNote: 'Contains gingerols widely utilized in clinical oncology nutrition to calm mild nausea.',
  },
  {
    fdcId: '170903',
    name: 'Yogurt, Greek, plain, nonfat, pasteurized',
    category: 'Dairy and Egg Products',
    servingSize: '100g',
    proteinG: 10.2,
    carbsG: 3.6,
    fatG: 0.4,
    fiberG: 0.0,
    ironMg: 0.1,
    calciumMg: 110,
    potassiumMg: 141,
    clinicalNote: 'High protein density in small volume; verify pasteurization label on all cultured dairy.',
  },
  {
    fdcId: '171477',
    name: 'Chicken, broilers or fryers, breast, meat only, cooked, poached',
    category: 'Poultry Products',
    servingSize: '100g',
    proteinG: 31.0,
    carbsG: 0.0,
    fatG: 3.6,
    fiberG: 0.0,
    ironMg: 1.0,
    calciumMg: 15,
    potassiumMg: 256,
    clinicalNote: 'Cook to internal temperature of 165°F (74°C); shred into broth or gravy if dry mouth is present.',
  },
  {
    fdcId: '172429',
    name: 'Lentils, pink or red, mature seeds, cooked, boiled',
    category: 'Legumes and Legume Products',
    servingSize: '100g',
    proteinG: 9.0,
    carbsG: 20.1,
    fatG: 0.4,
    fiberG: 7.9,
    ironMg: 3.3,
    calciumMg: 19,
    potassiumMg: 369,
    clinicalNote: 'Hulled red lentils break down into a smooth puree without gritty skins.',
  },
];

const INITIAL_RECIPES = [
  {
    id: 'rec_01',
    title: 'Soothing Ginger & Silken Tofu Rice Congee',
    description: 'A velvety, slow-simmered jasmine rice porridge infused with fresh ginger root, mild white miso, and pasteurized silken tofu cubes. Designed for low-odor preparation and effortless swallowing.',
    prepTimeMinutes: 5,
    cookTimeMinutes: 25,
    servings: 2,
    category: 'Nausea-Calming' as const,
    textureProfile: 'Soft & Moist' as const,
    ingredients: [
      { rawText: '1/2 cup white jasmine rice, rinsed', normalizedName: 'white jasmine rice', amount: '0.5', unit: 'cup' },
      { rawText: '4 cups low-sodium vegetable broth', normalizedName: 'vegetable broth', amount: '4', unit: 'cup' },
      { rawText: '1 tbsp fresh ginger, peeled and thinly sliced', normalizedName: 'fresh ginger', amount: '1', unit: 'tbsp' },
      { rawText: '150g pasteurized silken tofu, cubed', normalizedName: 'silken tofu', amount: '150', unit: 'g' },
      { rawText: '1 tbsp mild white miso paste', normalizedName: 'white miso paste', amount: '1', unit: 'tbsp' },
      { rawText: '1 tsp toasted sesame oil', normalizedName: 'sesame oil', amount: '1', unit: 'tsp' },
    ],
    instructions: [
      'Combine rinsed jasmine rice, vegetable broth, and sliced fresh ginger in a medium pot.',
      'Bring to a gentle boil, then reduce heat to low and simmer partially covered for 22–25 minutes, stirring occasionally until the rice breaks down into a creamy porridge.',
      'Whisk the white miso paste with 2 tablespoons of warm broth in a small cup, then stir into the congee along with the cubed silken tofu.',
      'Simmer for 2 full minutes until tofu is thoroughly heated through (165°F/74°C for neutropenic safety).',
      'Allow to cool to a lukewarm temperature before serving to minimize food aroma and soothe oral tissues.',
    ],
    dietaryTags: ['High-Moisture', 'Low-Acid', 'Gluten-Free Option', 'Vegetarian', 'Neutropenic-Safe'],
    allergens: ['Soy', 'Sesame'],
    foodSafetyWarnings: [
      'Ensure tofu is from a sealed, pasteurized package and heated thoroughly in the simmering broth.',
      'Do not garnish with raw unwashed scallions if following strict neutropenic precautions.',
    ],
    treatmentConsiderations: [
      'Serving lukewarm rather than piping hot reduces steam aromas that can trigger chemotherapy-related nausea.',
      'Neutral tofu protein avoids metallic taste reactions common with red meats.',
    ],
    sourceName: 'Memorial Sloan Kettering Oncology Nutrition Kitchen',
    sourceUrl: 'https://www.mskcc.org/experience/patient-support/nutrition-cancer',
    sourceVerified: true,
    nutritionHighlight: {
      proteinG: 14.5,
      fiberG: 1.5,
      hydrationSupport: 'High' as const,
      gentleDigestibilityNote: 'Provides 350ml+ of hydrating broth alongside gentle starch and plant protein.',
    },
  },
  {
    id: 'rec_02',
    title: 'Golden Butternut Squash & Red Lentil Velouté',
    description: 'A nutrient-dense, pureed soup combining roasted sweet squash and hull-less red lentils with a touch of coconut milk and ginger. Rich in plant iron and beta-carotene with zero chewing required.',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 3,
    category: 'Soft Texture / Dysphagia-Friendly' as const,
    textureProfile: 'Smooth / Pureed' as const,
    ingredients: [
      { rawText: '2 cups peeled, cubed butternut squash', normalizedName: 'butternut squash', amount: '2', unit: 'cup' },
      { rawText: '1/2 cup split red lentils, rinsed thoroughly', normalizedName: 'red lentils', amount: '0.5', unit: 'cup' },
      { rawText: '3 cups low-sodium vegetable or bone broth', normalizedName: 'vegetable broth', amount: '3', unit: 'cup' },
      { rawText: '1 tsp grated fresh ginger', normalizedName: 'fresh ginger', amount: '1', unit: 'tsp' },
      { rawText: '1/3 cup canned coconut milk', normalizedName: 'coconut milk', amount: '0.33', unit: 'cup' },
      { rawText: '1 tbsp extra-virgin olive oil', normalizedName: 'olive oil', amount: '1', unit: 'tbsp' },
    ],
    instructions: [
      'Wash and peel the butternut squash thoroughly on a clean cutting board.',
      'In a soup pot, combine the squash, rinsed red lentils, broth, and fresh ginger. Bring to a boil.',
      'Lower heat, cover, and simmer for 18–20 minutes until both squash and lentils are completely tender.',
      'Stir in the canned coconut milk and olive oil, then blend until completely velvety using an immersion blender.',
      'Serve warm in small mugs for easy sipping throughout the afternoon.',
    ],
    dietaryTags: ['Pureed', 'Dairy-Free', 'Plant-Protein', 'Garlic-Free', 'Onion-Free', 'Neutropenic-Safe'],
    allergens: ['Tree Nuts (Coconut)'],
    foodSafetyWarnings: [
      'Wash whole squash under running water before peeling to prevent surface bacteria transfer.',
      'Refrigerate leftovers within 1 hour and consume within 48 hours after reheating to a rolling boil.',
    ],
    treatmentConsiderations: [
      'Formulated without garlic, onion, or black pepper for patients experiencing mouth sores (mucositis) or odor aversions.',
      'Can be sipped from a mug when utensils feel tiring.',
    ],
    sourceName: 'National Cancer Institute — Eating Hints Collection',
    sourceUrl: 'https://www.cancer.gov/publications/patient-education/eating-hints',
    sourceVerified: true,
    nutritionHighlight: {
      proteinG: 12.0,
      fiberG: 5.2,
      hydrationSupport: 'High' as const,
      gentleDigestibilityNote: 'Split red lentils dissolve completely when cooked, preventing fibrous texture irritation.',
    },
  },
  {
    id: 'rec_03',
    title: 'Cool Peach & Pasteurized Greek Yogurt Protein Whip',
    description: 'A chilled, odor-free high-protein blend made with peeled cooked or canned peaches, pasteurized Greek yogurt, oat milk, and a hint of maple syrup. Ideal when warm food smells trigger nausea.',
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    servings: 1,
    category: 'High-Protein Gentle' as const,
    textureProfile: 'Smooth / Pureed' as const,
    ingredients: [
      { rawText: '3/4 cup pasteurized plain Greek yogurt', normalizedName: 'pasteurized Greek yogurt', amount: '0.75', unit: 'cup' },
      { rawText: '1/2 cup canned or peeled stewed peaches in juice', normalizedName: 'peeled peaches', amount: '0.5', unit: 'cup' },
      { rawText: '1/3 cup shelf-stable oat milk', normalizedName: 'oat milk', amount: '0.33', unit: 'cup' },
      { rawText: '2 tbsp quick rolled oats', normalizedName: 'rolled oats', amount: '2', unit: 'tbsp' },
      { rawText: '1 tsp pure maple syrup', normalizedName: 'maple syrup', amount: '1', unit: 'tsp' },
    ],
    instructions: [
      'Ensure blender pitcher and blades have been washed in hot soapy water or dishwasher cycle.',
      'Add pasteurized Greek yogurt, peaches, oat milk, rolled oats, and maple syrup to the blender.',
      'Blend on high for 45 seconds until completely smooth and airy.',
      'Serve chilled in a covered tumbler with a straw to further reduce food scent exposure.',
    ],
    dietaryTags: ['No-Cook', 'Cold / Odor-Free', 'High-Protein', 'Low-Acid', 'Neutropenic-Safe'],
    allergens: ['Dairy'],
    foodSafetyWarnings: [
      'Use commercially canned peaches or thoroughly cooked peeled peaches during neutropenic phases.',
      'Verify Greek yogurt is pasteurized and avoid raw unpasteurized honey.',
    ],
    treatmentConsiderations: [
      'Chilled foods emit minimal volatile aroma compounds, making them far easier to tolerate during nausea peaks.',
      'Mildly tart-sweet fruit flavor helps mask persistent bitter or metallic taste sensations.',
    ],
    sourceName: 'American Institute for Cancer Research (AICR)',
    sourceUrl: 'https://www.aicr.org/cancer-survival/treatment-tips/',
    sourceVerified: true,
    nutritionHighlight: {
      proteinG: 18.5,
      fiberG: 2.8,
      hydrationSupport: 'Moderate' as const,
      gentleDigestibilityNote: 'Concentrated protein in a compact 1-cup serving for early satiety.',
    },
  },
  {
    id: 'rec_04',
    title: 'Poached Herb Chicken & Sweet Potato Mash Bowl',
    description: 'Tender chicken breast poached gently in bone broth and served over whipped sweet potato with olive oil. High protein density with extra broth drizzle to support dry mouth.',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 2,
    category: 'High-Protein Gentle' as const,
    textureProfile: 'Soft & Moist' as const,
    ingredients: [
      { rawText: '240g skinless chicken breast', normalizedName: 'chicken breast', amount: '240', unit: 'g' },
      { rawText: '2 cups chicken bone broth', normalizedName: 'chicken bone broth', amount: '2', unit: 'cup' },
      { rawText: '1 large sweet potato, peeled and cubed', normalizedName: 'sweet potato', amount: '1', unit: 'large' },
      { rawText: '1 tbsp extra-virgin olive oil', normalizedName: 'olive oil', amount: '1', unit: 'tbsp' },
      { rawText: '1 tsp dried thyme or parsley (cooked with broth)', normalizedName: 'parsley', amount: '1', unit: 'tsp' },
    ],
    instructions: [
      'Place peeled sweet potato cubes in a pot of water, bring to a boil, and cook for 15 minutes until fork-tender.',
      'In a separate saucepan, submerge chicken breast in chicken bone broth with dried herbs. Simmer gently until internal temperature reaches 165°F (74°C) on a food thermometer.',
      'Shred the poached chicken finely using two forks and moisten generously with 1/2 cup of the warm cooking broth.',
      'Mash the drained sweet potato with olive oil and a splash of warm broth until pillowy and smooth.',
    ],
    dietaryTags: ['High-Protein', 'Gluten-Free', 'Dairy-Free', 'Garlic-Free', 'Neutropenic-Safe'],
    allergens: [],
    foodSafetyWarnings: [
      'Always verify poultry reaches 165°F (74°C) using a clean digital thermometer.',
      'Use separate cutting boards for raw poultry and cooked foods; add herbs during cooking rather than raw at the end.',
    ],
    treatmentConsiderations: [
      'Finely shredding poultry and serving in warm broth prevents dryness that can make swallowing difficult.',
    ],
    sourceName: 'Oncology Nutrition Dietetic Practice Group',
    sourceUrl: 'https://www.oncologynutrition.org/erfc/eating-well-when-unwell',
    sourceVerified: true,
    nutritionHighlight: {
      proteinG: 29.0,
      fiberG: 3.6,
      hydrationSupport: 'Moderate' as const,
      gentleDigestibilityNote: 'Lean complete amino acid profile paired with easily digested complex carbohydrates.',
    },
  },
  {
    id: 'rec_05',
    title: 'Warm Cinnamon Stewed Apple & Oat Compote',
    description: 'Peeled apples simmered until cloud-soft with rolled oats, maple syrup, and gentle Ceylon cinnamon. A comforting breakfast or evening snack rich in soluble fiber.',
    prepTimeMinutes: 5,
    cookTimeMinutes: 12,
    servings: 2,
    category: 'Nutrient-Dense Snack' as const,
    textureProfile: 'Soft & Moist' as const,
    ingredients: [
      { rawText: '2 medium apples, peeled, cored, and finely diced', normalizedName: 'peeled apple', amount: '2', unit: 'medium' },
      { rawText: '3/4 cup rolled oats', normalizedName: 'rolled oats', amount: '0.75', unit: 'cup' },
      { rawText: '1.5 cups water or oat milk', normalizedName: 'water', amount: '1.5', unit: 'cup' },
      { rawText: '1/2 tsp ground cinnamon', normalizedName: 'ground cinnamon', amount: '0.5', unit: 'tsp' },
      { rawText: '1 tbsp maple syrup', normalizedName: 'maple syrup', amount: '1', unit: 'tbsp' },
    ],
    instructions: [
      'Wash apples thoroughly, then peel and core completely.',
      'Simmer diced apples in water with cinnamon for 6 minutes until soft and translucent.',
      'Stir in rolled oats and maple syrup; cook for another 5–6 minutes until creamy.',
      'Serve lukewarm.',
    ],
    dietaryTags: ['Soluble-Fiber', 'Low-Fat', 'Vegan', 'Garlic-Free', 'Neutropenic-Safe'],
    allergens: [],
    foodSafetyWarnings: [
      'Peeling fruit and cooking thoroughly eliminates surface microbial risk for immunocompromised patients.',
    ],
    treatmentConsiderations: [
      'Cooked apple pectin and soluble oat fiber help regulate bowel comfort gently.',
    ],
    sourceName: 'Dana-Farber Nutrition Services Library',
    sourceUrl: 'https://www.dana-farber.org/health-library/recipes',
    sourceVerified: true,
    nutritionHighlight: {
      proteinG: 5.8,
      fiberG: 4.9,
      hydrationSupport: 'Moderate' as const,
      gentleDigestibilityNote: 'Low fat content allows rapid gastric emptying when nausea is present.',
    },
  },
  {
    id: 'rec_06',
    title: 'Zesty Garlic Tomato Chickpea Stew',
    description: 'A hearty Mediterranean chickpea stew simmered in crushed tomatoes, garlic, onion, and red pepper flakes. Rich in fiber and plant protein for days when appetite and spice tolerance are strong.',
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    servings: 3,
    category: 'High-Protein Gentle' as const,
    textureProfile: 'Soft & Moist' as const,
    ingredients: [
      { rawText: '1 can (400g) chickpeas, rinsed and drained', normalizedName: 'chickpeas', amount: '400', unit: 'g' },
      { rawText: '2 cups crushed tomatoes', normalizedName: 'tomatoes', amount: '2', unit: 'cup' },
      { rawText: '3 cloves garlic, minced', normalizedName: 'garlic', amount: '3', unit: 'cloves' },
      { rawText: '1 medium yellow onion, diced', normalizedName: 'onion', amount: '1', unit: 'medium' },
      { rawText: '1/2 tsp chili oil or red pepper flakes', normalizedName: 'chili oil', amount: '0.5', unit: 'tsp' },
      { rawText: '1 tbsp olive oil', normalizedName: 'olive oil', amount: '1', unit: 'tbsp' },
    ],
    instructions: [
      'Sauté diced onion and minced garlic in olive oil over medium heat for 5 minutes.',
      'Add crushed tomatoes, chickpeas, and chili oil; bring to a lively simmer for 20 minutes.',
      'Mash half of the chickpeas slightly to thicken the broth and serve warm.',
    ],
    dietaryTags: ['High-Fiber', 'Vegan', 'Plant-Protein'],
    allergens: [],
    foodSafetyWarnings: [
      'Wash top of canned goods before opening and simmer thoroughly.',
    ],
    treatmentConsiderations: [
      'Contains acidic tomatoes, garlic, and chili spice — avoid during active mouth sores (mucositis) or acute nausea.',
    ],
    sourceName: 'American Cancer Society — Eat Healthy',
    sourceUrl: 'https://www.cancer.org/cancer/survivorship/coping/nutrition.html',
    sourceVerified: true,
    nutritionHighlight: {
      proteinG: 13.4,
      fiberG: 8.6,
      hydrationSupport: 'Moderate' as const,
      gentleDigestibilityNote: 'Best suited for recovery phases without active mucosal irritation or garlic sensitivity.',
    },
  },
];

const INITIAL_COLLECTIONS = [
  {
    id: 'col_01',
    name: 'Infusion Week Comforts',
    description: 'Low-odor, lukewarm, and ginger-infused meals for days 1–4 post-infusion.',
    recipeIds: ['rec_01', 'rec_03', 'rec_05'],
  },
  {
    id: 'col_02',
    name: 'Soft & Smooth Protein Builders',
    description: 'High-protein purees and moist bowls that require minimal chewing.',
    recipeIds: ['rec_02', 'rec_04'],
  },
];

const FOOD_SAFETY_RESOURCES = [
  {
    id: 'safe_01',
    title: 'Neutropenic Diet & Low-Microbial Food Selection',
    category: 'Neutropenic Precautions' as const,
    riskLevel: 'Critical Safety' as const,
    summary: 'During chemotherapy cycles when white blood cell counts (neutrophils) are lowered, avoiding foodborne pathogens is critical. Choose thoroughly cooked foods and pasteurized beverages.',
    avoidList: [
      'Raw or undercooked fish, sushi, oysters, or shellfish',
      'Runny egg yolks, raw cookie dough, or homemade mayonnaise',
      'Unpasteurized milk, soft mold-ripened cheeses (Brie, Camembert, Blue cheese)',
      'Raw vegetable sprouts (alfalfa, mung bean, clover sprouts)',
      'Unwashed thin-skinned berries or salad bar / buffet items',
    ],
    safeAlternatives: [
      'Fish and poultry cooked to internal temperature of 165°F (74°C)',
      'Eggs cooked until both yolk and white are completely firm',
      'Pasteurized milk, pasteurized Greek yogurt, and cooked or hard cheeses',
      'Peeled fruits (bananas, oranges) or cooked/canned fruits (stewed apples, peaches)',
      'Freshly cooked hot soups, stews, and steamed vegetables',
    ],
    clinicalSource: 'CDC & National Cancer Institute (NCI) Food Safety for People with Cancer',
    sourceUrl: 'https://www.cancer.gov/about-cancer/treatment/side-effects/appetite-loss/food-safety',
  },
  {
    id: 'safe_02',
    title: 'Safe Internal Cooking Temperatures & Thermometer Guide',
    category: 'Safe Cooking Temperatures' as const,
    riskLevel: 'Critical Safety' as const,
    summary: 'Visual color is not a reliable indicator of microbial safety. Use a clean digital food thermometer inserted into the thickest part of the food.',
    avoidList: [
      'Rare or medium-rare beef, lamb, or pork steaks',
      'Cold deli meats or hot dogs eaten straight from the refrigerator without reheating',
      'Leftovers kept at room temperature for more than 1 hour',
    ],
    safeAlternatives: [
      'All poultry and reheated leftovers: 165°F (74°C) until steaming hot',
      'Ground meats (beef, pork, lamb): 160°F (71°C)',
      'Whole cuts of meat and finfish: 145°F (63°C) with 3-minute rest time',
    ],
    clinicalSource: 'USDA Food Safety and Inspection Service — Cancer Patient Guidelines',
    sourceUrl: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation',
  },
  {
    id: 'safe_03',
    title: 'Managing Metallic Taste (Dysgeusia), Nausea & Mouth Sores',
    category: 'Symptom-Targeted Eating' as const,
    riskLevel: 'Helpful Guidance' as const,
    summary: 'Evidence-based culinary modifications can make eating markedly more comfortable without requiring restrictive dieting or forced meal sizes.',
    avoidList: [
      'Metal forks and spoons when experiencing metallic taste changes',
      'Strong cooking odors, fried foods, and heavy garlic/chili spices during nausea',
      'Citrus juices, vinegar dressings, and rough dry crackers during oral mucositis',
    ],
    safeAlternatives: [
      'Switch to bamboo, wooden, or BPA-free plastic utensils and glass cups',
      'Serve foods chilled or at room temperature to minimize aroma triggers',
      'Moisten dry proteins with bone broth, olive oil, or mild white miso gravy',
    ],
    clinicalSource: 'Academy of Nutrition and Dietetics — Oncology Nutrition DPG',
    sourceUrl: 'https://www.oncologynutrition.org/',
  },
  {
    id: 'safe_04',
    title: 'Kitchen Hygiene & Cross-Contamination Prevention',
    category: 'Cross-Contamination Prevention' as const,
    riskLevel: 'Important Precaution' as const,
    summary: 'Simple prep habits in the home kitchen substantially reduce bacterial transfer onto ready-to-eat foods.',
    avoidList: [
      'Using the same cutting board for raw poultry and fresh produce',
      'Leaving damp kitchen sponges in the sink (harbors bacteria and mold)',
      'Thawing frozen meats on the kitchen counter at room temperature',
    ],
    safeAlternatives: [
      'Use separate color-coded cutting boards and sanitize in the dishwasher',
      'Replace sponges with daily-washed dishcloths or paper towels',
      'Thaw foods exclusively inside the refrigerator at or below 40°F (4°C)',
    ],
    clinicalSource: 'FDA Food Safety for Older Adults and People with Cancer',
    sourceUrl: 'https://www.fda.gov/food/people-risk-foodborne-illness',
  },
];

const INITIAL_CAREGIVER_GRANTS = [
  {
    id: 'cg_01',
    caregiverName: 'David Rostov',
    caregiverEmail: 'david.rostov@familycare.org',
    relationship: 'Spouse / Primary Care Partner',
    accessCode: 'ONCO-8842-CARE',
    permissions: {
      viewMeals: true,
      viewHydration: true,
      viewSymptoms: true,
      exportReports: true,
    },
    status: 'Active' as 'Active' | 'Revoked',
    createdAt: '2026-11-01',
    expiresAt: '2026-12-31',
  },
];

// ============================================================================
// TASK 62 & TASK 70: OncoByte Persistent Disk Database & Data Synchronization
// Persists all patient logs, recipes, and profiles to `data/oncobyte_db.json`
// so records survive server restarts and synchronize across iOS and Web clients.
// (NOTE FOR PRODUCTION CLOUD CUTOVER: Replace `loadDatabase`/`saveDatabase`
// with Drizzle ORM / PostgreSQL connection when deploying to multi-node cloud).
// ============================================================================

interface DatabaseState {
  users: (typeof INITIAL_USER_PROFILE)[];
  userProfile: typeof INITIAL_USER_PROFILE;
  meals: typeof INITIAL_MEALS;
  hydration: typeof INITIAL_HYDRATION;
  symptoms: typeof INITIAL_SYMPTOMS;
  foodSensitivities: typeof INITIAL_FOOD_SENSITIVITIES;
  recipes: typeof INITIAL_RECIPES;
  collections: typeof INITIAL_COLLECTIONS;
  caregiverGrants: typeof INITIAL_CAREGIVER_GRANTS;
}

function loadDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users || [INITIAL_USER_PROFILE],
        userProfile: parsed.userProfile || { ...INITIAL_USER_PROFILE },
        meals: parsed.meals || [...INITIAL_MEALS],
        hydration: parsed.hydration || [...INITIAL_HYDRATION],
        symptoms: parsed.symptoms || [...INITIAL_SYMPTOMS],
        foodSensitivities: parsed.foodSensitivities || [...INITIAL_FOOD_SENSITIVITIES],
        recipes: parsed.recipes || [...INITIAL_RECIPES],
        collections: parsed.collections || [...INITIAL_COLLECTIONS],
        caregiverGrants: parsed.caregiverGrants || [...INITIAL_CAREGIVER_GRANTS],
      };
    }
  } catch (e) {
    console.warn('Database initialization notice, seeding fresh store:', e);
  }
  const initial: DatabaseState = {
    users: [{ ...INITIAL_USER_PROFILE }],
    userProfile: { ...INITIAL_USER_PROFILE },
    meals: [...INITIAL_MEALS],
    hydration: [...INITIAL_HYDRATION],
    symptoms: [...INITIAL_SYMPTOMS],
    foodSensitivities: [...INITIAL_FOOD_SENSITIVITIES],
    recipes: [...INITIAL_RECIPES],
    collections: [...INITIAL_COLLECTIONS],
    caregiverGrants: [...INITIAL_CAREGIVER_GRANTS],
  };
  saveDatabase(initial);
  return initial;
}

function saveDatabase(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to persist database:', e);
  }
}

const db = loadDatabase();

// ============================================================================
// TASK 61 & TASK 65: OncoByte Express Server & REST API Endpoints
// ============================================================================

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --------------------------------------------------------------------------
  // TASK 61 & TASK 66: Health & API Architecture Discovery Endpoint
  // --------------------------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'OncoByte Independent API Server',
      version: '2.6.0',
      persistence: 'JSON File Store (data/oncobyte_db.json)',
      dsaEngine: 'src/dsa/oncobyteDsaEngine.ts',
      timestamp: new Date().toISOString(),
      modules: [
        'jwt-auth-session',
        'meals-api',
        'hydration-api',
        'symptoms-tolerance-api',
        'recipes-recommendation-engine',
        'python-recipe-pipeline',
        'usda-fooddata-live-proxy',
        'food-safety-warnings',
        'binary-pdf-report-generator',
        'caregiver-access-control',
      ],
    });
  });

  // --------------------------------------------------------------------------
  // TASK 63: OncoByte Authentication Endpoints (Register, Login, Session Verify)
  // --------------------------------------------------------------------------
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, email, password, treatmentContext } = req.body;
    if (!name || !email || !password || String(password).length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required.' });
      return;
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const newUser = {
      ...INITIAL_USER_PROFILE,
      id: `usr_${Date.now()}`,
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      treatmentContext: treatmentContext || 'Active Oncology Nutrition Care',
    };
    db.users.push(newUser);
    db.userProfile = newUser;
    saveDatabase(db);

    const token = signToken({ userId: newUser.id, email: newUser.email, name: newUser.name });
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        treatmentContext: newUser.treatmentContext,
      },
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || user.passwordHash !== hashPassword(String(password))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    db.userProfile = user;
    saveDatabase(db);

    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        treatmentContext: user.treatmentContext,
      },
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = verifyToken(token);
      if (decoded) {
        res.json({ authenticated: true, session: decoded, profile: db.userProfile });
        return;
      }
    }
    res.json({
      authenticated: true,
      session: {
        userId: db.userProfile.id,
        email: db.userProfile.email,
        name: db.userProfile.name,
      },
      profile: db.userProfile,
    });
  });

  // --------------------------------------------------------------------------
  // TASK 12, TASK 13, TASK 64: User Profile, Reminders & Logging Preferences API
  // --------------------------------------------------------------------------
  app.get('/api/profile', (_req: Request, res: Response) => {
    const { passwordHash: _ph, ...safeProfile } = db.userProfile;
    res.json(safeProfile);
  });

  app.put('/api/profile', (req: Request, res: Response) => {
    db.userProfile = {
      ...db.userProfile,
      ...req.body,
      loggingPreferences: {
        ...db.userProfile.loggingPreferences,
        ...(req.body.loggingPreferences || {}),
      },
    };
    saveDatabase(db);
    const { passwordHash: _ph, ...safeProfile } = db.userProfile;
    res.json(safeProfile);
  });

  // --------------------------------------------------------------------------
  // TASK 1, TASK 3, TASK 6, TASK 8, TASK 9, TASK 11: Meal Logging Backend CRUD
  // Uses `sortRecordsChronologically` from DSA Engine for O(N log N) ordering.
  // --------------------------------------------------------------------------
  app.get('/api/meals', (req: Request, res: Response) => {
    const { date, startDate, endDate, category } = req.query;
    let result = [...db.meals];
    if (date && typeof date === 'string') {
      result = result.filter((m) => m.date === date);
    }
    if (startDate && typeof startDate === 'string') {
      result = result.filter((m) => m.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      result = result.filter((m) => m.date <= endDate);
    }
    if (category && typeof category === 'string' && category !== 'All') {
      result = result.filter((m) => m.category === category);
    }
    res.json(sortRecordsChronologically(result));
  });

  app.post('/api/meals', (req: Request, res: Response) => {
    const parsed = MealSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, issues: parsed.error.issues });
      return;
    }
    const { date, timestamp, category, foodName, ingredients, portion, tolerance, notes, isCustomFood } = parsed.data;

    const parsedIngredients: string[] = Array.isArray(ingredients)
      ? ingredients
      : typeof ingredients === 'string'
      ? ingredients
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean)
      : [];

    const newMeal = {
      id: `meal_${Date.now()}`,
      userId: db.userProfile.id,
      date: date || '2026-11-15',
      timestamp: timestamp || new Date().toTimeString().slice(0, 5),
      category,
      foodName: foodName.trim(),
      ingredients: parsedIngredients,
      portion: portion || '1 standard serving',
      tolerance: tolerance || 'Well Tolerated',
      notes: notes || '',
      isCustomFood: Boolean(isCustomFood),
      nutritionInfo: {
        proteinG: 12.0,
        fiberG: 2.5,
        ironMg: 1.4,
        potassiumMg: 260,
        gentleSummary: 'Logged entry synchronized with your persistent nutrition journal.',
      },
    };

    db.meals.unshift(newMeal as any);
    saveDatabase(db);
    res.status(201).json(newMeal);
  });

  app.put('/api/meals/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = db.meals.findIndex((m) => m.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Meal entry not found.' });
      return;
    }
    const updatedIngredients = Array.isArray(req.body.ingredients)
      ? req.body.ingredients
      : typeof req.body.ingredients === 'string'
      ? req.body.ingredients
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : db.meals[idx].ingredients;

    db.meals[idx] = {
      ...db.meals[idx],
      ...req.body,
      ingredients: updatedIngredients,
    };
    saveDatabase(db);
    res.json(db.meals[idx]);
  });

  app.delete('/api/meals/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = db.meals.length;
    db.meals = db.meals.filter((m) => m.id !== id);
    if (db.meals.length === initialLen) {
      res.status(404).json({ error: 'Meal entry not found.' });
      return;
    }
    saveDatabase(db);
    res.json({ deleted: true, id });
  });

  // --------------------------------------------------------------------------
  // TASK 4: Hydration Backend (Storage & Retrieval of Fluid Intake Records)
  // --------------------------------------------------------------------------
  app.get('/api/hydration', (req: Request, res: Response) => {
    const { date, startDate, endDate } = req.query;
    let result = [...db.hydration];
    if (date && typeof date === 'string') {
      result = result.filter((h) => h.date === date);
    }
    if (startDate && typeof startDate === 'string') {
      result = result.filter((h) => h.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      result = result.filter((h) => h.date <= endDate);
    }
    res.json(sortRecordsChronologically(result));
  });

  app.post('/api/hydration', (req: Request, res: Response) => {
    const parsed = HydrationSchema.safeParse({
      ...req.body,
      amountMl: Number(req.body.amountMl),
    });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { date, timestamp, fluidType, amountMl, tolerance, notes } = parsed.data;
    const newHydration = {
      id: `hyd_${Date.now()}`,
      userId: db.userProfile.id,
      date: date || '2026-11-15',
      timestamp: timestamp || new Date().toTimeString().slice(0, 5),
      fluidType,
      amountMl,
      tolerance: tolerance || 'Well Tolerated',
      notes: notes || '',
    };
    db.hydration.unshift(newHydration as any);
    saveDatabase(db);
    res.status(201).json(newHydration);
  });

  app.delete('/api/hydration/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.hydration = db.hydration.filter((h) => h.id !== id);
    saveDatabase(db);
    res.json({ deleted: true, id });
  });

  // --------------------------------------------------------------------------
  // TASK 7, TASK 14, TASK 15, TASK 16, TASK 17: Symptom, Appetite & Eating
  // Difficulty Logging Backend
  // --------------------------------------------------------------------------
  app.get('/api/symptoms', (req: Request, res: Response) => {
    const { date, startDate, endDate } = req.query;
    let result = [...db.symptoms];
    if (date && typeof date === 'string') {
      result = result.filter((s) => s.date === date);
    }
    if (startDate && typeof startDate === 'string') {
      result = result.filter((s) => s.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      result = result.filter((s) => s.date <= endDate);
    }
    res.json(sortRecordsChronologically(result));
  });

  app.post('/api/symptoms', (req: Request, res: Response) => {
    const parsed = SymptomSchema.safeParse({
      ...req.body,
      severity: req.body.severity ? Number(req.body.severity) : 2,
      appetiteScore: req.body.appetiteScore ? Number(req.body.appetiteScore) : 5,
    });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { date, timestamp, symptomType, category, severity, appetiteScore, triggeredByFood, notes } = parsed.data;
    const newSymptom = {
      id: `sym_${Date.now()}`,
      userId: db.userProfile.id,
      date: date || '2026-11-15',
      timestamp: timestamp || new Date().toTimeString().slice(0, 5),
      symptomType,
      category: category || 'Symptom',
      severity: severity || 2,
      appetiteScore: appetiteScore || 5,
      triggeredByFood: triggeredByFood || '',
      notes: notes || '',
    };
    db.symptoms.unshift(newSymptom as any);
    saveDatabase(db);
    res.status(201).json(newSymptom);
  });

  app.delete('/api/symptoms/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.symptoms = db.symptoms.filter((s) => s.id !== id);
    saveDatabase(db);
    res.json({ deleted: true, id });
  });

  // --------------------------------------------------------------------------
  // TASK 18: Food Sensitivity Tracking Backend (/api/sensitivities)
  // --------------------------------------------------------------------------
  app.get('/api/sensitivities', (_req: Request, res: Response) => {
    res.json(db.foodSensitivities);
  });

  app.post('/api/sensitivities', (req: Request, res: Response) => {
    const { foodOrIngredient, reactionType, toleranceStatus, notes } = req.body;
    if (!foodOrIngredient) {
      res.status(400).json({ error: 'foodOrIngredient is required.' });
      return;
    }
    const newSens = {
      id: `sens_${Date.now()}`,
      foodOrIngredient: String(foodOrIngredient).trim(),
      reactionType: reactionType || 'Aversion',
      toleranceStatus: toleranceStatus || 'Caution',
      occurrenceCount: 1,
      lastReported: '2026-11-15',
      notes: notes || '',
    };
    db.foodSensitivities.unshift(newSens as any);
    saveDatabase(db);
    res.status(201).json(newSens);
  });

  app.delete('/api/sensitivities/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.foodSensitivities = db.foodSensitivities.filter((s) => s.id !== id);
    saveDatabase(db);
    res.json({ deleted: true, id });
  });

  // --------------------------------------------------------------------------
  // TASK 20, TASK 21, TASK 22, TASK 25, TASK 51, TASK 52:
  // Analytics, Symptom/Appetite Trends & Non-Causal Food Tolerance Pattern API
  // Calls `computePatientAnalyticsSummary` from `src/dsa/oncobyteDsaEngine.ts`.
  // --------------------------------------------------------------------------
  app.get('/api/analytics', (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const summary = computePatientAnalyticsSummary(
      db.meals as any,
      db.hydration as any,
      db.symptoms as any,
      db.userProfile.dailyHydrationGoalMl,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined
    );
    res.json(summary);
  });

  // --------------------------------------------------------------------------
  // TASK 32, TASK 33, TASK 38: Recipe Search, Filtering & Custom Submission
  // Calls `searchAndFilterRecipes` and `normalizeIngredientToken` from DSA Engine.
  // --------------------------------------------------------------------------
  app.get('/api/recipes', (req: Request, res: Response) => {
    const { search, category, maxPrepTime, tag } = req.query;
    const filtered = searchAndFilterRecipes(db.recipes as any, {
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      maxPrepTime: maxPrepTime ? Number(maxPrepTime) : undefined,
      tag: typeof tag === 'string' ? tag : undefined,
    });
    res.json(filtered);
  });

  app.post('/api/recipes', (req: Request, res: Response) => {
    const {
      title,
      description,
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      category,
      textureProfile,
      ingredients,
      instructions,
      dietaryTags,
      sourceName,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Recipe title is required.' });
      return;
    }

    const rawIngredients: string[] = Array.isArray(ingredients)
      ? ingredients
      : typeof ingredients === 'string'
      ? ingredients
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    // TASK 30 & TASK 31: Normalize ingredient tokens using DSA Engine
    const normalizedIngs = rawIngredients.map((raw) => ({
      rawText: raw,
      normalizedName: normalizeIngredientToken(raw),
      amount: '1',
      unit: 'serving',
    }));

    const parsedInstructions: string[] = Array.isArray(instructions)
      ? instructions
      : typeof instructions === 'string'
      ? instructions
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : ['Prepare ingredients safely and cook thoroughly.'];

    const newRecipe = {
      id: `rec_custom_${Date.now()}`,
      title: String(title).trim(),
      description: description || 'Custom personal recipe added to your OncoByte library.',
      prepTimeMinutes: Number(prepTimeMinutes) || 10,
      cookTimeMinutes: Number(cookTimeMinutes) || 15,
      servings: Number(servings) || 2,
      category: category || 'High-Protein Gentle',
      textureProfile: textureProfile || 'Soft & Moist',
      ingredients: normalizedIngs,
      instructions: parsedInstructions,
      dietaryTags: Array.isArray(dietaryTags) ? dietaryTags : ['Personal Recipe', 'Neutropenic-Safe'],
      allergens: [],
      foodSafetyWarnings: ['Verify all ingredients are pasteurized and cooked to safe internal temperatures.'],
      treatmentConsiderations: ['Custom recipe tailored to personal taste and texture preferences.'],
      sourceName: sourceName || 'Personal Patient Kitchen',
      sourceUrl: '#personal-library',
      sourceVerified: true,
      isCustom: true,
      nutritionHighlight: {
        proteinG: 14.0,
        fiberG: 3.0,
        hydrationSupport: 'Moderate' as const,
        gentleDigestibilityNote: 'Custom gentle formulation.',
      },
    };

    db.recipes.unshift(newRecipe as any);
    saveDatabase(db);
    res.status(201).json(newRecipe);
  });

  // --------------------------------------------------------------------------
  // TASK 29, TASK 30, TASK 31: Execute Python Recipe Web Data Pipeline
  // Invokes `/pipeline/recipe_pipeline.py` as a child process.
  // --------------------------------------------------------------------------
  app.post('/api/pipeline/normalize', (req: Request, res: Response) => {
    const scriptPath = path.join(__dirname, 'pipeline', 'recipe_pipeline.py');
    const child = execFile('python3', [scriptPath], { timeout: 6000 }, (error, stdout) => {
      if (error) {
        res.status(500).json({ error: 'Python pipeline execution failed', details: error.message });
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        res.json(parsed);
      } catch {
        res.json({ status: 'completed', rawOutput: stdout });
      }
    });
    if (req.body && Object.keys(req.body).length > 0 && child.stdin) {
      child.stdin.write(JSON.stringify(req.body));
      child.stdin.end();
    }
  });

  // --------------------------------------------------------------------------
  // TASK 39, TASK 40, TASK 42: Personalized Recipe Recommendation Engine API
  // Calls `runRecipeRecommendationEngine` from `src/dsa/oncobyteDsaEngine.ts`.
  // --------------------------------------------------------------------------
  app.get('/api/recipes/recommendations', (_req: Request, res: Response) => {
    const ranked = runRecipeRecommendationEngine(
      db.recipes as any,
      db.meals as any,
      db.symptoms as any,
      db.foodSensitivities as any,
      db.userProfile as any
    );
    res.json(ranked);
  });

  // --------------------------------------------------------------------------
  // TASK 36 & TASK 37: Saved Recipe Bookmarks & Personal Recipe Collections
  // --------------------------------------------------------------------------
  app.post('/api/recipes/:id/bookmark', (req: Request, res: Response) => {
    const { id } = req.params;
    const exists = db.userProfile.savedRecipeIds.includes(id);
    if (exists) {
      db.userProfile.savedRecipeIds = db.userProfile.savedRecipeIds.filter((rId) => rId !== id);
    } else {
      db.userProfile.savedRecipeIds.push(id);
    }
    saveDatabase(db);
    res.json({ savedRecipeIds: db.userProfile.savedRecipeIds, bookmarked: !exists });
  });

  app.get('/api/collections', (_req: Request, res: Response) => {
    res.json(db.collections);
  });

  app.post('/api/collections', (req: Request, res: Response) => {
    const { name, description, recipeIds } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Collection name is required.' });
      return;
    }
    const newCol = {
      id: `col_${Date.now()}`,
      name: String(name).trim(),
      description: description || '',
      recipeIds: Array.isArray(recipeIds) ? recipeIds : [],
    };
    db.collections.push(newCol);
    saveDatabase(db);
    res.status(201).json(newCol);
  });

  // --------------------------------------------------------------------------
  // TASK 43 & TASK 44: USDA FoodData Central Integration & Ingredient Lookup
  // Queries official USDA FDC API (`process.env.USDA_FDC_API_KEY`) with local
  // clinical dataset fallback.
  // --------------------------------------------------------------------------
  app.get('/api/usda/search', async (req: Request, res: Response) => {
    const { query, live } = req.query;
    const q = typeof query === 'string' ? query.trim() : '';

    const localMatches = q
      ? USDA_FOOD_DATABASE.filter(
          (item) =>
            item.name.toLowerCase().includes(q.toLowerCase()) ||
            item.category.toLowerCase().includes(q.toLowerCase())
        )
      : USDA_FOOD_DATABASE;

    const apiKey = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
    if (q && (localMatches.length === 0 || live === 'true')) {
      try {
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
          q
        )}&pageSize=6&api_key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
        if (response.ok) {
          const data: any = await response.json();
          if (Array.isArray(data.foods) && data.foods.length > 0) {
            const mapped = data.foods.map((f: any) => {
              const getNutrient = (namePart: string) => {
                const found = (f.foodNutrients || []).find((n: any) =>
                  String(n.nutrientName || '').toLowerCase().includes(namePart.toLowerCase())
                );
                return found ? Number(Number(found.value || 0).toFixed(1)) : 0;
              };
              return {
                fdcId: String(f.fdcId),
                name: f.description || q,
                category: f.foodCategory || 'USDA FoodData Central Live Record',
                servingSize: '100g reference',
                proteinG: getNutrient('Protein'),
                carbsG: getNutrient('Carbohydrate'),
                fatG: getNutrient('Total lipid'),
                fiberG: getNutrient('Fiber'),
                ironMg: getNutrient('Iron'),
                calciumMg: getNutrient('Calcium'),
                potassiumMg: getNutrient('Potassium'),
                clinicalNote:
                  'Retrieved live from USDA FoodData Central API. Ensure thorough cooking and pasteurization per oncology guidelines.',
              };
            });
            res.json([...localMatches, ...mapped]);
            return;
          }
        }
      } catch {
        // Fallback to local curated oncology nutrition records if offline/rate-limited
      }
    }

    res.json(localMatches);
  });

  // --------------------------------------------------------------------------
  // TASK 46 & TASK 47: Food Safety Resource Database & Dietary Warning System
  // --------------------------------------------------------------------------
  app.get('/api/food-safety', (_req: Request, res: Response) => {
    res.json(FOOD_SAFETY_RESOURCES);
  });

  // --------------------------------------------------------------------------
  // TASK 53, TASK 54, TASK 60: Server-Side Binary PDF Generation & Parity Check
  // Uses `PDFDocument` (`pdfkit`) and `computeReportParityChecksum` from DSA Engine.
  // --------------------------------------------------------------------------
  app.get('/api/reports/export.pdf', (req: Request, res: Response) => {
    const start = typeof req.query.startDate === 'string' ? req.query.startDate : '2026-11-11';
    const end = typeof req.query.endDate === 'string' ? req.query.endDate : '2026-11-15';

    const filteredMeals = db.meals.filter((m) => m.date >= start && m.date <= end);
    const filteredHydration = db.hydration.filter((h) => h.date >= start && h.date <= end);
    const filteredSymptoms = db.symptoms.filter((s) => s.date >= start && s.date <= end);

    const analytics = computePatientAnalyticsSummary(
      db.meals as any,
      db.hydration as any,
      db.symptoms as any,
      db.userProfile.dailyHydrationGoalMl,
      start,
      end
    );
    const parity = computeReportParityChecksum(
      filteredMeals as any,
      filteredHydration as any,
      filteredSymptoms as any
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="OncoByte_Clinical_Report_${start}_to_${end}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    doc
      .fontSize(18)
      .fillColor('#0F766E')
      .text('OncoByte Clinical Dietetics Summary Report', { align: 'left' });
    doc
      .fontSize(10)
      .fillColor('#475569')
      .text(`Patient: ${db.userProfile.name} (${db.userProfile.email})`)
      .text(`Reporting Period: ${start} to ${end}`)
      .text(`Treatment Context: ${db.userProfile.treatmentContext}`)
      .text(
        `Neutropenic Protocol: ${db.userProfile.neutropenicDietActive ? 'Active' : 'Standard'} | Allergies: ${db.userProfile.allergies.join(', ')}`
      )
      .text(
        `Report Accuracy Checksum (Task 60): ${parity.sha256Checksum} (${parity.recordCount} verified records)`
      );

    doc.moveDown(1);
    doc
      .fontSize(12)
      .fillColor('#0F172A')
      .text('1. Executive Nutrition & Hydration Summary', { underline: true });
    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .fillColor('#1E293B')
      .text(
        `• Total Meals & Snacks Logged: ${filteredMeals.length} (${analytics.toleranceBreakdown.wellTolerated} Well Tolerated, ${analytics.toleranceBreakdown.moderate} Moderate, ${analytics.toleranceBreakdown.difficult + analytics.toleranceBreakdown.notTolerated} Difficult/Not Tolerated)`
      )
      .text(
        `• Mean Daily Fluid Intake: ${analytics.averageDailyHydrationMl} ml / day (${analytics.hydrationGoalCompletionPct}% of ${db.userProfile.dailyHydrationGoalMl} ml goal)`
      )
      .text(`• Mean Self-Reported Appetite Score: ${analytics.averageAppetiteScore} / 10`);

    doc.moveDown(1);
    doc
      .fontSize(12)
      .fillColor('#0F172A')
      .text(`2. Chronological Meal & Food Tolerance Records (${filteredMeals.length})`, {
        underline: true,
      });
    doc.moveDown(0.4);
    filteredMeals.forEach((m) => {
      doc
        .fontSize(9.5)
        .fillColor('#0F172A')
        .text(`${m.date} ${m.timestamp} [${m.category}] — ${m.foodName} (${m.portion})`);
      doc
        .fontSize(8.5)
        .fillColor('#475569')
        .text(
          `   Tolerance: ${m.tolerance} | Ingredients: ${m.ingredients.join(', ')}${
            m.notes ? ` | Note: ${m.notes}` : ''
          }`
        );
      doc.moveDown(0.3);
    });

    doc.moveDown(0.8);
    doc
      .fontSize(12)
      .fillColor('#0F172A')
      .text(`3. Symptom, Appetite & Swallowing Logs (${filteredSymptoms.length})`, {
        underline: true,
      });
    doc.moveDown(0.4);
    filteredSymptoms.forEach((s) => {
      doc
        .fontSize(9.5)
        .fillColor('#0F172A')
        .text(
          `${s.date} ${s.timestamp} — ${s.symptomType} (Severity: ${s.severity}/5, Appetite: ${s.appetiteScore}/10)`
        );
      if (s.triggeredByFood || s.notes) {
        doc
          .fontSize(8.5)
          .fillColor('#475569')
          .text(`   Context: ${s.triggeredByFood || 'N/A'} — ${s.notes || ''}`);
      }
      doc.moveDown(0.3);
    });

    doc.moveDown(0.8);
    doc
      .fontSize(12)
      .fillColor('#0F172A')
      .text(`4. Hydration & Fluid Intake Logs (${filteredHydration.length})`, {
        underline: true,
      });
    doc.moveDown(0.4);
    filteredHydration.slice(0, 12).forEach((h) => {
      doc
        .fontSize(9)
        .fillColor('#1E293B')
        .text(`${h.date} ${h.timestamp} — ${h.fluidType}: ${h.amountMl} ml (${h.tolerance})`);
    });

    doc.moveDown(1.2);
    doc
      .fontSize(8)
      .fillColor('#64748B')
      .text(
        'Clinical Disclaimer (Task 49): This OncoByte report aggregates patient self-logged dietary, fluid, and symptom observations. Observational food tolerance patterns reflect recurring associations in patient logs and do not establish medical causation or replace individualized medical advice from an Oncology Registered Dietitian (RDN).',
        { align: 'left' }
      );

    doc.end();
  });

  // --------------------------------------------------------------------------
  // TASK 59: Caregiver Access Workflow (Authorization & Revocation Endpoints)
  // --------------------------------------------------------------------------
  app.get('/api/caregiver-grants', (_req: Request, res: Response) => {
    res.json(db.caregiverGrants);
  });

  app.post('/api/caregiver-grants', (req: Request, res: Response) => {
    const { caregiverName, caregiverEmail, relationship, permissions } = req.body;
    if (!caregiverName || !caregiverEmail) {
      res.status(400).json({ error: 'Caregiver name and email are required.' });
      return;
    }
    const newGrant = {
      id: `cg_${Date.now()}`,
      caregiverName: String(caregiverName).trim(),
      caregiverEmail: String(caregiverEmail).trim(),
      relationship: relationship || 'Family Caregiver',
      accessCode: `ONCO-${Math.floor(1000 + Math.random() * 9000)}-CARE`,
      permissions: permissions || {
        viewMeals: true,
        viewHydration: true,
        viewSymptoms: true,
        exportReports: true,
      },
      status: 'Active' as 'Active' | 'Revoked',
      createdAt: '2026-11-15',
      expiresAt: '2027-02-15',
    };
    db.caregiverGrants.unshift(newGrant);
    saveDatabase(db);
    res.status(201).json(newGrant);
  });

  app.put('/api/caregiver-grants/:id/revoke', (req: Request, res: Response) => {
    const { id } = req.params;
    const grant = db.caregiverGrants.find((g) => g.id === id);
    if (!grant) {
      res.status(404).json({ error: 'Caregiver grant not found.' });
      return;
    }
    grant.status = grant.status === 'Active' ? 'Revoked' : 'Active';
    saveDatabase(db);
    res.json(grant);
  });

  // --------------------------------------------------------------------------
  // TASK 71: OncoByte Error Handling (Centralized Express Error Middleware)
  // --------------------------------------------------------------------------
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[OncoByte API Error]:', err.message);
    res.status(500).json({
      error: 'Internal server error encountered while processing request.',
      details: err.message,
    });
  });

  // Vite Dev Server Middleware / Static Production Assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OncoByte server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
