/**
 * ============================================================================
 * ONCOBYTE DAILY NUTRITION JOURNAL MODULE (src/components/DailyJournalView.tsx)
 * ============================================================================
 * Tasks Completed in this File:
 *   - TASK 2:  Meal Logging Interface (Breakfast, Lunch, Dinner, Snacks)
 *   - TASK 3:  Meal Details (Food names, ingredients, portions, timestamps)
 *   - TASK 5:  Hydration Tracking Interface & Daily Progress Bar
 *   - TASK 6:  Food Tolerance Logging ('Well Tolerated' to 'Not Tolerated')
 *   - TASK 7:  Quick-Entry Logging (Low-friction one-tap symptom buttons)
 *   - TASK 8:  Custom Food Entries (Homemade/unlisted food flag)
 *   - TASK 9:  Meal History Chronological Display
 *   - TASK 10: Consolidated Daily Nutrition Journal View
 *   - TASK 11: Meal Editing and Deletion Controls
 *   - TASK 12: Meal & Fluid Reminders Configuration UI
 *   - TASK 13: Logging Preferences Customization UI
 *   - TASK 45: Supportive Nutrition Display (Protein/Fiber focus, non-calorie-obsessed)
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  MealEntry,
  HydrationEntry,
  SymptomEntry,
  UserProfile,
  MealCategory,
  ToleranceLevel,
} from '../types/oncobyte';
import {
  Plus,
  Droplets,
  Utensils,
  AlertCircle,
  Trash2,
  Edit3,
  Check,
  Clock,
  SlidersHorizontal,
  Bell,
} from 'lucide-react';

interface DailyJournalViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  meals: MealEntry[];
  hydration: HydrationEntry[];
  symptoms: SymptomEntry[];
  profile: UserProfile;
  onAddMeal: (meal: Partial<MealEntry>) => Promise<void>;
  onUpdateMeal: (id: string, meal: Partial<MealEntry>) => Promise<void>;
  onDeleteMeal: (id: string) => Promise<void>;
  onAddHydration: (hyd: Partial<HydrationEntry>) => Promise<void>;
  onDeleteHydration: (id: string) => Promise<void>;
  onQuickLogSymptom: (sym: Partial<SymptomEntry>) => Promise<void>;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AVAILABLE_DATES = [
  { date: '2026-11-11', label: 'Wed 11' },
  { date: '2026-11-12', label: 'Thu 12' },
  { date: '2026-11-13', label: 'Fri 13' },
  { date: '2026-11-14', label: 'Sat 14' },
  { date: '2026-11-15', label: 'Sun 15 (Today)' },
];

const MEAL_CATEGORIES: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const TOLERANCE_LEVELS: ToleranceLevel[] = ['Well Tolerated', 'Moderate', 'Difficult', 'Not Tolerated'];

const FLUID_TYPES: HydrationEntry['fluidType'][] = [
  'Water',
  'Electrolyte Solution',
  'Ginger Tea',
  'Clear Broth',
  'Bone Broth',
  'Herbal Tea',
  'Fruit Smoothie',
];

export const DailyJournalView: React.FC<DailyJournalViewProps> = ({
  selectedDate,
  onSelectDate,
  meals,
  hydration,
  symptoms,
  profile,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onAddHydration,
  onDeleteHydration,
  onQuickLogSymptom,
  onUpdateProfile,
}) => {
  // Meal form state
  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealCategory, setMealCategory] = useState<MealCategory>('Breakfast');
  const [foodName, setFoodName] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [portion, setPortion] = useState('');
  const [timestamp, setTimestamp] = useState('12:30');
  const [tolerance, setTolerance] = useState<ToleranceLevel>('Well Tolerated');
  const [notes, setNotes] = useState('');
  const [isCustomFood, setIsCustomFood] = useState(false);

  // Hydration custom form state
  const [fluidType, setFluidType] = useState<HydrationEntry['fluidType']>('Ginger Tea');
  const [fluidAmount, setFluidAmount] = useState<number>(250);
  const [fluidNotes, setFluidNotes] = useState('');

  // Preferences & Reminders drawer toggle
  const [showPrefsPanel, setShowPrefsPanel] = useState(false);
  const [quickLogFeedback, setQuickLogFeedback] = useState<string | null>(null);

  const dayMeals = meals.filter((m) => m.date === selectedDate);
  const dayHydration = hydration.filter((h) => h.date === selectedDate);
  const daySymptoms = symptoms.filter((s) => s.date === selectedDate);

  const totalHydrationMl = dayHydration.reduce((sum, h) => sum + h.amountMl, 0);
  const hydrationGoal = profile.dailyHydrationGoalMl || 2000;
  const hydrationPct = Math.min(100, Math.round((totalHydrationMl / hydrationGoal) * 100));

  const totalProteinG = dayMeals.reduce((sum, m) => sum + (m.nutritionInfo?.proteinG || 0), 0);
  const wellToleratedCount = dayMeals.filter((m) => m.tolerance === 'Well Tolerated').length;

  const openNewMealModal = (cat: MealCategory = 'Breakfast') => {
    setEditingMealId(null);
    setMealCategory(cat);
    setFoodName('');
    setIngredientsText('');
    setPortion('1 small bowl');
    setTimestamp(new Date().toTimeString().slice(0, 5));
    setTolerance('Well Tolerated');
    setNotes('');
    setIsCustomFood(false);
    setShowMealForm(true);
  };

  const openEditMealModal = (meal: MealEntry) => {
    setEditingMealId(meal.id);
    setMealCategory(meal.category);
    setFoodName(meal.foodName);
    setIngredientsText(meal.ingredients.join(', '));
    setPortion(meal.portion);
    setTimestamp(meal.timestamp);
    setTolerance(meal.tolerance);
    setNotes(meal.notes || '');
    setIsCustomFood(Boolean(meal.isCustomFood));
    setShowMealForm(true);
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;

    const payload = {
      date: selectedDate,
      timestamp,
      category: mealCategory,
      foodName: foodName.trim(),
      ingredients: ingredientsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      portion: portion.trim() || '1 serving',
      tolerance,
      notes: notes.trim(),
      isCustomFood,
    };

    if (editingMealId) {
      await onUpdateMeal(editingMealId, payload);
    } else {
      await onAddMeal(payload);
    }
    setShowMealForm(false);
    setEditingMealId(null);
  };

  const handleQuickFluid = async (type: HydrationEntry['fluidType'], amountMl: number) => {
    await onAddHydration({
      date: selectedDate,
      timestamp: new Date().toTimeString().slice(0, 5),
      fluidType: type,
      amountMl,
      tolerance: 'Well Tolerated',
      notes: `Quick-logged ${amountMl}ml ${type}`,
    });
  };

  const handleCustomFluidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fluidAmount <= 0) return;
    await onAddHydration({
      date: selectedDate,
      timestamp: new Date().toTimeString().slice(0, 5),
      fluidType,
      amountMl: fluidAmount,
      tolerance: 'Well Tolerated',
      notes: fluidNotes.trim(),
    });
    setFluidNotes('');
  };

  const handleOneTapExperience = async (
    symptomType: SymptomEntry['symptomType'],
    category: SymptomEntry['category'],
    severity: 1 | 2 | 3 | 4 | 5
  ) => {
    await onQuickLogSymptom({
      date: selectedDate,
      timestamp: new Date().toTimeString().slice(0, 5),
      symptomType,
      category,
      severity,
      appetiteScore: 5,
      notes: 'Logged via low-friction quick-entry button in Daily Journal.',
    });
    setQuickLogFeedback(`Recorded "${symptomType}" at ${new Date().toTimeString().slice(0, 5)}`);
    setTimeout(() => setQuickLogFeedback(null), 3500);
  };

  const togglePreference = async (key: keyof UserProfile['loggingPreferences']) => {
    await onUpdateProfile({
      loggingPreferences: {
        ...profile.loggingPreferences,
        [key]: !profile.loggingPreferences[key],
      },
    });
  };

  const toggleReminder = async (remId: string) => {
    const updated = profile.reminders.map((r) =>
      r.id === remId ? { ...r, enabled: !r.enabled } : r
    );
    await onUpdateProfile({ reminders: updated });
  };

  return (
    <div className="space-y-8">
      {/* Top Bar Controls: Date Selector + Preferences Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Consolidated Daily Nutrition Journal
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gentle, supportive tracking for meals, hydration, and food tolerance without calorie pressure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {AVAILABLE_DATES.map((d) => (
              <button
                key={d.date}
                onClick={() => onSelectDate(d.date)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedDate === d.date
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPrefsPanel(!showPrefsPanel)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
            Journal Preferences & Reminders
          </button>
        </div>
      </div>

      {/* Collapsible Logging Preferences & Meal Reminders Panel */}
      {showPrefsPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Customize Visible Journal Categories
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose which tracking modules appear on your daily screen to reduce fatigue.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ['showMealJournal', 'Meals & Snacks Log'],
                    ['showHydration', 'Hydration & Fluid Tracker'],
                    ['showSymptoms', 'Quick-Entry Symptom Buttons'],
                    ['showToleranceRatings', 'Food Tolerance Ratings'],
                    ['showGentleNutritionMetrics', 'Gentle Protein & Nutrient Notes'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={profile.loggingPreferences[key]}
                      onChange={() => togglePreference(key)}
                      className="w-4 h-4 rounded text-teal-700 focus:ring-teal-600"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Optional Gentle Meal & Fluid Reminders
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Low-pressure prompts for small frequent meals and electrolyte sipping.
                  </p>
                </div>
                <Bell className="w-4 h-4 text-teal-700" />
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {profile.reminders.map((rem) => (
                  <div key={rem.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-600 tabular-nums">
                        {rem.time}
                      </span>
                      <span className="text-xs font-medium text-slate-800">{rem.label}</span>
                      <span className="text-xs text-slate-400">· {rem.type}</span>
                    </div>
                    <button
                      onClick={() => toggleReminder(rem.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        rem.enabled
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {rem.enabled ? 'Active' : 'Paused'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low-Friction Quick-Entry Bar for Nausea, Fatigue, and Eating Challenges */}
      {profile.loggingPreferences.showSymptoms && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Low-Friction Quick Experience Log
              </h2>
              <p className="text-xs text-slate-500">
                One tap records how you feel right now into your clinical timeline — no typing required.
              </p>
            </div>
            {quickLogFeedback && (
              <span className="text-xs font-medium text-teal-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {quickLogFeedback}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOneTapExperience('Nausea', 'Quick Entry', 2)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + Mild Nausea
            </button>
            <button
              onClick={() => handleOneTapExperience('Fatigue', 'Quick Entry', 3)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + Too Tired to Cook (Fatigue)
            </button>
            <button
              onClick={() => handleOneTapExperience('Taste Changes (Metallic/Bitter)', 'Quick Entry', 3)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + Metallic / Bitter Taste
            </button>
            <button
              onClick={() => handleOneTapExperience('Swallowing Difficulty (Dysphagia)', 'Eating Difficulty', 3)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + Difficulty Swallowing
            </button>
            <button
              onClick={() => handleOneTapExperience('Dry Mouth (Xerostomia)', 'Eating Difficulty', 2)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + Dry Mouth
            </button>
            <button
              onClick={() => handleOneTapExperience('Early Satiety', 'Eating Difficulty', 2)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + Felt Full Quickly
            </button>
          </div>
        </div>
      )}

      {/* Daily Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Meals & Snacks Logged</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {dayMeals.length}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              {wellToleratedCount} well tolerated
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Daily Fluid Intake</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-teal-700 font-mono tabular-nums">
              {totalHydrationMl} ml
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {hydrationPct}% of {hydrationGoal} ml
            </span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300"
              style={{ width: `${hydrationPct}%` }}
            />
          </div>
        </div>

        {profile.loggingPreferences.showGentleNutritionMetrics && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">Gentle Protein Support</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {totalProteinG.toFixed(1)} g
              </span>
              <span className="text-xs text-slate-500">Tissue recovery focus</span>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Symptom & Appetite Logs</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {daySymptoms.length}
            </span>
            <span className="text-xs text-slate-500">
              {daySymptoms.length > 0 ? `Latest: ${daySymptoms[0].symptomType}` : 'Comfortable day'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Meal Journal (Left 7 cols) + Hydration Tracker (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Meals & Snacks Logging */}
        {profile.loggingPreferences.showMealJournal && (
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Meals, Portions & Food Tolerance
                </h2>
                <p className="text-xs text-slate-500">
                  Record breakfast, lunch, dinner, snacks, or custom homemade foods.
                </p>
              </div>
              <button
                onClick={() => openNewMealModal('Breakfast')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Log Meal or Snack
              </button>
            </div>

            {/* Category Quick Launch Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {MEAL_CATEGORIES.map((cat) => {
                const count = dayMeals.filter((m) => m.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => openNewMealModal(cat)}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-teal-600 text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{cat}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {count} {count === 1 ? 'entry' : 'entries'}
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Add / Edit Meal Modal Form */}
            {showMealForm && (
              <form
                onSubmit={handleSaveMeal}
                className="bg-white border border-teal-600 rounded-xl p-6 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingMealId ? 'Edit Meal Entry' : 'Record Meal or Custom Food Entry'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMealForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Meal Category
                    </label>
                    <select
                      value={mealCategory}
                      onChange={(e) => setMealCategory(e.target.value as MealCategory)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                    >
                      {MEAL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Time Eaten
                    </label>
                    <input
                      type="time"
                      value={timestamp}
                      onChange={(e) => setTimestamp(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Portion (Optional)
                    </label>
                    <input
                      type="text"
                      value={portion}
                      onChange={(e) => setPortion(e.target.value)}
                      placeholder="e.g., 1/2 cup, 4-5 bites"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Food or Meal Name *
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCustomFood}
                        onChange={(e) => setIsCustomFood(e.target.checked)}
                        className="rounded text-teal-700"
                      />
                      <span>Custom / Homemade Food Entry</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="e.g., Ginger Miso Congee, Homemade Peach Smoothie"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Key Ingredients (comma-separated for tolerance pattern matching)
                  </label>
                  <input
                    type="text"
                    value={ingredientsText}
                    onChange={(e) => setIngredientsText(e.target.value)}
                    placeholder="e.g., white rice, fresh ginger, silken tofu, vegetable broth"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    How Well Was This Food Tolerated?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TOLERANCE_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTolerance(level)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          tolerance === level
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preparation & Experience Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Served lukewarm; easy to swallow; helped calm morning nausea."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMealForm(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
                  >
                    {editingMealId ? 'Save Changes' : 'Save Meal Entry'}
                  </button>
                </div>
              </form>
            )}

            {/* Chronological Meal History for Selected Date */}
            {dayMeals.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <Utensils className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">
                  No meals recorded for {selectedDate}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Even a few bites of toast, broth, or smoothie count toward your care log.
                </p>
                <button
                  onClick={() => openNewMealModal('Breakfast')}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800"
                >
                  Log First Entry
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {dayMeals.map((meal) => (
                  <div key={meal.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        {/* Unboxed metadata row per Zero-Pill rule */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-800">{meal.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {meal.timestamp}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Portion: {meal.portion}</span>
                          {profile.loggingPreferences.showToleranceRatings && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`font-medium ${
                                  meal.tolerance === 'Well Tolerated'
                                    ? 'text-emerald-700'
                                    : meal.tolerance === 'Moderate'
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                Tolerance: {meal.tolerance}
                              </span>
                            </>
                          )}
                          {meal.isCustomFood && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-teal-700">Custom Food</span>
                            </>
                          )}
                        </div>

                        <h3 className="text-base font-semibold text-slate-900">
                          {meal.foodName}
                        </h3>

                        {meal.ingredients.length > 0 && (
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-slate-700">Ingredients:</span>{' '}
                            {meal.ingredients.join(', ')}
                          </p>
                        )}

                        {meal.notes && (
                          <p className="text-xs text-slate-600 italic pt-0.5">
                            &ldquo;{meal.notes}&rdquo;
                          </p>
                        )}

                        {profile.loggingPreferences.showGentleNutritionMetrics &&
                          meal.nutritionInfo && (
                            <div className="pt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                              <span>Protein: {meal.nutritionInfo.proteinG}g</span>
                              <span aria-hidden="true">·</span>
                              <span>Fiber: {meal.nutritionInfo.fiberG}g</span>
                              <span aria-hidden="true">·</span>
                              <span>Potassium: {meal.nutritionInfo.potassiumMg}mg</span>
                              {meal.nutritionInfo.gentleSummary && (
                                <span className="font-sans text-slate-500">
                                  — {meal.nutritionInfo.gentleSummary}
                                </span>
                              )}
                            </div>
                          )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditMealModal(meal)}
                          title="Edit meal entry"
                          className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMeal(meal.id)}
                          title="Delete meal entry"
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right Column: Hydration Tracking & Daily Fluid Progress */}
        {profile.loggingPreferences.showHydration && (
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Hydration & Electrolyte Tracking
              </h2>
              <p className="text-xs text-slate-500">
                Small, frequent sips help manage dry mouth and treatment fatigue.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
              {/* Quick-Add Fluid Buttons */}
              <div>
                <div className="text-xs font-semibold text-slate-800 mb-2.5">
                  One-Tap Sip & Cup Logging
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickFluid('Ginger Tea', 200)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Warm Ginger Tea</span>
                    <span className="font-mono tabular-nums text-teal-700">+200ml</span>
                  </button>
                  <button
                    onClick={() => handleQuickFluid('Electrolyte Solution', 250)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Electrolyte Sip</span>
                    <span className="font-mono tabular-nums text-teal-700">+250ml</span>
                  </button>
                  <button
                    onClick={() => handleQuickFluid('Bone Broth', 250)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Warm Bone Broth</span>
                    <span className="font-mono tabular-nums text-teal-700">+250ml</span>
                  </button>
                  <button
                    onClick={() => handleQuickFluid('Water', 250)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Filtered Water</span>
                    <span className="font-mono tabular-nums text-teal-700">+250ml</span>
                  </button>
                </div>
              </div>

              {/* Custom Fluid Form */}
              <form
                onSubmit={handleCustomFluidSubmit}
                className="pt-4 border-t border-slate-100 space-y-3"
              >
                <div className="text-xs font-semibold text-slate-800">
                  Custom Fluid Entry
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Beverage</label>
                    <select
                      value={fluidType}
                      onChange={(e) =>
                        setFluidType(e.target.value as HydrationEntry['fluidType'])
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      {FLUID_TYPES.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Volume (ml)</label>
                    <input
                      type="number"
                      min={25}
                      max={1500}
                      step={25}
                      value={fluidAmount}
                      onChange={(e) => setFluidAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fluidNotes}
                    onChange={(e) => setFluidNotes(e.target.value)}
                    placeholder="Optional note (e.g., sipped with ice chips)"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shrink-0"
                  >
                    Add Fluid
                  </button>
                </div>
              </form>

              {/* Daily Fluid Log List */}
              <div className="pt-4 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-800 mb-2">
                  Today&apos;s Recorded Fluids ({dayHydration.length})
                </div>
                {dayHydration.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    No fluids logged yet for {selectedDate}.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {dayHydration.map((h) => (
                      <div
                        key={h.id}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Droplets className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="font-medium text-slate-900">{h.fluidType}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-mono text-slate-500 tabular-nums">
                              {h.timestamp}
                            </span>
                          </div>
                          {h.notes && (
                            <p className="text-[11px] text-slate-500 pl-5 mt-0.5">{h.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-semibold text-teal-700 tabular-nums">
                            {h.amountMl} ml
                          </span>
                          <button
                            onClick={() => onDeleteHydration(h.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete fluid record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active Neutropenic / Allergy Safety Reminder Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-900">
                    Active Profile Dietary Safeguards
                  </div>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-800">Allergies:</span>{' '}
                    {profile.allergies.join(', ')} ·{' '}
                    <span className="font-medium text-slate-800">Precautions:</span>{' '}
                    {profile.neutropenicDietActive
                      ? 'Neutropenic Low-Microbial Diet Active'
                      : 'Standard Food Safety'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
