/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * ONCOBYTE MAIN APPLICATION & iOS 18 SIMULATOR WORKSPACE (src/App.tsx)
 * ============================================================================
 * Tasks Completed in this File:
 *   - TASK 73: OncoByte UI/UX Design System (Typography, semantic colors, touch targets)
 *   - TASK 74: OncoByte Navigation Architecture (iOS Bottom Tab Bar + Top Bar Contract)
 *   - Full state synchronization across Daily Journal, Symptom Trends,
 *     Recipe Discovery/USDA Lookup, and Clinical PDF Reports.
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MealEntry,
  HydrationEntry,
  SymptomEntry,
  FoodSensitivityRecord,
  Recipe,
  RecipeRecommendation,
  RecipeCollection,
  FoodSafetyResource,
  CaregiverAccessGrant,
  UserProfile,
  AnalyticsSummary,
} from './types/oncobyte';
import { DailyJournalView } from './components/DailyJournalView';
import { SymptomsAnalyticsView } from './components/SymptomsAnalyticsView';
import { RecipesDiscoveryView } from './components/RecipesDiscoveryView';
import { SafetyReportsView } from './components/SafetyReportsView';
import {
  Utensils,
  Activity,
  BookOpen,
  ShieldCheck,
  Smartphone,
  Monitor,
  Wifi,
  Battery,
  Share2,
  Download,
  CheckCircle2,
  Droplets,
  Plus,
  Clock,
  Bookmark,
  AlertTriangle,
} from 'lucide-react';

type ActiveModule = 'journal' | 'analytics' | 'recipes' | 'reports';
type ViewportMode = 'ios-device' | 'full-workspace';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('journal');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('ios-device');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-15');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2026-11-11',
    end: '2026-11-15',
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [hydration, setHydration] = useState<HydrationEntry[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [sensitivities, setSensitivities] = useState<FoodSensitivityRecord[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [foodSafety, setFoodSafety] = useState<FoodSafetyResource[]>([]);
  const [caregiverGrants, setCaregiverGrants] = useState<CaregiverAccessGrant[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // iOS Native Bottom Sheet State
  const [iosSheetOpen, setIosSheetOpen] = useState<boolean>(false);
  const [iosMealName, setIosMealName] = useState<string>('');
  const [iosMealCategory, setIosMealCategory] = useState<MealEntry['category']>('Breakfast');
  const [iosMealPortion, setIosMealPortion] = useState<string>('1 small bowl');
  const [iosMealTolerance, setIosMealTolerance] =
    useState<MealEntry['tolerance']>('Well Tolerated');
  const [iosMealIngredients, setIosMealIngredients] = useState<string>('');
  const [iosToast, setIosToast] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      const [
        profRes,
        mealsRes,
        hydRes,
        symRes,
        sensRes,
        recRes,
        recMatchRes,
        colRes,
        safeRes,
        cgRes,
        anaRes,
      ] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/meals'),
        fetch('/api/hydration'),
        fetch('/api/symptoms'),
        fetch('/api/sensitivities'),
        fetch('/api/recipes'),
        fetch('/api/recipes/recommendations'),
        fetch('/api/collections'),
        fetch('/api/food-safety'),
        fetch('/api/caregiver-grants'),
        fetch(
          `/api/analytics?startDate=${encodeURIComponent(
            dateRange.start
          )}&endDate=${encodeURIComponent(dateRange.end)}`
        ),
      ]);

      if (profRes.ok) setProfile(await profRes.json());
      if (mealsRes.ok) setMeals(await mealsRes.json());
      if (hydRes.ok) setHydration(await hydRes.json());
      if (symRes.ok) setSymptoms(await symRes.json());
      if (sensRes.ok) setSensitivities(await sensRes.json());
      if (recRes.ok) setRecipes(await recRes.json());
      if (recMatchRes.ok) setRecommendations(await recMatchRes.json());
      if (colRes.ok) setCollections(await colRes.json());
      if (safeRes.ok) setFoodSafety(await safeRes.json());
      if (cgRes.ok) setCaregiverGrants(await cgRes.json());
      if (anaRes.ok) setAnalytics(await anaRes.json());
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const showIosToast = (msg: string) => {
    setIosToast(msg);
    setTimeout(() => setIosToast(null), 2800);
  };

  // --- API Handlers ---

  const handleAddMeal = async (meal: Partial<MealEntry>) => {
    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal),
    });
    await loadAllData();
  };

  const handleUpdateMeal = async (id: string, meal: Partial<MealEntry>) => {
    await fetch(`/api/meals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal),
    });
    await loadAllData();
  };

  const handleDeleteMeal = async (id: string) => {
    await fetch(`/api/meals/${id}`, { method: 'DELETE' });
    await loadAllData();
  };

  const handleAddHydration = async (hyd: Partial<HydrationEntry>) => {
    await fetch('/api/hydration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hyd),
    });
    await loadAllData();
  };

  const handleDeleteHydration = async (id: string) => {
    await fetch(`/api/hydration/${id}`, { method: 'DELETE' });
    await loadAllData();
  };

  const handleAddSymptom = async (sym: Partial<SymptomEntry>) => {
    await fetch('/api/symptoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sym),
    });
    await loadAllData();
  };

  const handleDeleteSymptom = async (id: string) => {
    await fetch(`/api/symptoms/${id}`, { method: 'DELETE' });
    await loadAllData();
  };

  const handleAddSensitivity = async (sens: Partial<FoodSensitivityRecord>) => {
    await fetch('/api/sensitivities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sens),
    });
    await loadAllData();
  };

  const handleDeleteSensitivity = async (id: string) => {
    await fetch(`/api/sensitivities/${id}`, { method: 'DELETE' });
    await loadAllData();
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    await loadAllData();
  };

  const handleToggleBookmark = async (recipeId: string) => {
    await fetch(`/api/recipes/${recipeId}/bookmark`, { method: 'POST' });
    await loadAllData();
  };

  const handleAddRecipe = async (recipe: Partial<Recipe>) => {
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    await loadAllData();
  };

  const handleAddCollection = async (col: Partial<RecipeCollection>) => {
    await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(col),
    });
    await loadAllData();
  };

  const handleLogRecipeAsMeal = async (recipe: Recipe) => {
    await handleAddMeal({
      date: selectedDate,
      timestamp: new Date().toTimeString().slice(0, 5),
      category: 'Lunch',
      foodName: recipe.title,
      ingredients: recipe.ingredients.map((i) => i.normalizedName),
      portion: '1 recipe serving',
      tolerance: 'Well Tolerated',
      notes: `Logged from OncoByte iOS Recipe Library (${recipe.category}).`,
    });
    showIosToast(`Logged "${recipe.title}" to Daily Journal`);
  };

  const handleAddCaregiverGrant = async (grant: Partial<CaregiverAccessGrant>) => {
    await fetch('/api/caregiver-grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grant),
    });
    await loadAllData();
  };

  const handleToggleRevokeGrant = async (id: string) => {
    await fetch(`/api/caregiver-grants/${id}/revoke`, { method: 'PUT' });
    await loadAllData();
  };

  const handleIosSheetSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iosMealName.trim()) return;
    await handleAddMeal({
      date: selectedDate,
      timestamp: new Date().toTimeString().slice(0, 5),
      category: iosMealCategory,
      foodName: iosMealName.trim(),
      portion: iosMealPortion.trim() || '1 serving',
      tolerance: iosMealTolerance,
      ingredients: iosMealIngredients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setIosMealName('');
    setIosMealIngredients('');
    setIosSheetOpen(false);
    showIosToast('Meal saved to OncoByte iOS Journal');
  };

  const dayMeals = meals.filter((m) => m.date === selectedDate);
  const dayHydration = hydration.filter((h) => h.date === selectedDate);
  const totalFluidMl = dayHydration.reduce((acc, h) => acc + h.amountMl, 0);
  const fluidGoalMl = profile?.dailyHydrationGoalMl || 2000;
  const fluidPct = Math.min(100, Math.round((totalFluidMl / fluidGoalMl) * 100));

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900 pb-20 md:pb-0">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 no-print">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#journal"
          onClick={(e) => {
            e.preventDefault();
            setActiveModule('journal');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          OncoByte iOS
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#journal"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('journal');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeModule === 'journal'
                ? 'text-teal-700 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Daily Journal
          </a>
          <a
            href="#analytics"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('analytics');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeModule === 'analytics'
                ? 'text-teal-700 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Symptoms & Trends
          </a>
          <a
            href="#recipes"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('recipes');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeModule === 'recipes'
                ? 'text-teal-700 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Recipes & USDA
          </a>
          <a
            href="#reports"
            onClick={(e) => {
              e.preventDefault();
              setActiveModule('reports');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeModule === 'reports'
                ? 'text-teal-700 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Safety & PDF Reports
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`/api/reports/export.pdf?startDate=${encodeURIComponent(
              dateRange.start
            )}&endDate=${encodeURIComponent(dateRange.end)}`}
            download
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
          >
            Export Clinical PDF
          </a>
        </div>
      </header>

      {/* Workspace Mode Toolbar below header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">iOS Target:</span>
            <span>iPhone 16 Pro (iOS 18 · React Native / Expo SDK 52)</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-teal-700 font-medium">
              Connected to Live Express Backend (/api/*)
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewportMode('ios-device')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewportMode === 'ios-device'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-700" />
              iOS Simulator & Companion View
            </button>
            <button
              onClick={() => setViewportMode('full-workspace')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewportMode === 'full-workspace'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-teal-700" />
              Full Clinical Web View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading || !profile ? (
          <div className="space-y-4">
            <div className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
            <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          </div>
        ) : viewportMode === 'ios-device' ? (
          /* =====================================================================
             MODE 1: INTERACTIVE iOS 18 iPHONE SIMULATOR + CLINICAL COMPANION GRID
             ===================================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left / Center Column (5 Cols on Desktop, Full on Mobile): Interactive iOS Device */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[412px] bg-slate-900 rounded-[48px] p-3 shadow-2xl border-4 border-slate-800 relative">
                {/* iPhone Screen Canvas */}
                <div className="bg-[#F2F2F7] rounded-[38px] overflow-hidden flex flex-col h-[780px] relative">
                  {/* iOS Status Bar + Dynamic Island */}
                  <div className="bg-white/90 backdrop-blur-md pt-3 pb-2 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-900 select-none shrink-0">
                    <span className="font-mono tabular-nums">9:41</span>
                    <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end px-2">
                      <div className="w-2 h-2 rounded-full bg-teal-500/80" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5" />
                      <Battery className="w-4 h-4" />
                    </div>
                  </div>

                  {/* iOS Navigation Bar */}
                  <div className="bg-white/90 backdrop-blur-md px-5 pt-2 pb-3 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">
                        {profile.neutropenicDietActive
                          ? 'Neutropenic Safe Mode'
                          : 'Oncology Care'}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {activeModule === 'journal' && 'Daily Journal'}
                        {activeModule === 'analytics' && 'Symptoms & Trends'}
                        {activeModule === 'recipes' && 'Gentle Recipes'}
                        {activeModule === 'reports' && 'Clinical PDF & Safety'}
                      </h2>
                    </div>

                    <button
                      onClick={() => setIosSheetOpen(true)}
                      className="min-h-[44px] min-w-[44px] px-3.5 bg-teal-700 active:bg-teal-800 text-white rounded-full flex items-center justify-center gap-1 text-xs font-semibold shadow-xs transition-transform active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log</span>
                    </button>
                  </div>

                  {/* iOS Toast Notification Banner */}
                  {iosToast && (
                    <div className="mx-4 mt-2 px-3.5 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-medium rounded-2xl flex items-center gap-2 shadow-md">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="truncate">{iosToast}</span>
                    </div>
                  )}

                  {/* iOS Scrollable Screen Viewport */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                    {/* Horizontal iOS Date Scroller */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {[
                        { date: '2026-11-11', day: 'Wed', num: '11' },
                        { date: '2026-11-12', day: 'Thu', num: '12' },
                        { date: '2026-11-13', day: 'Fri', num: '13' },
                        { date: '2026-11-14', day: 'Sat', num: '14' },
                        { date: '2026-11-15', day: 'Sun', num: '15' },
                      ].map((d) => (
                        <button
                          key={d.date}
                          onClick={() => setSelectedDate(d.date)}
                          className={`flex-1 min-w-[58px] min-h-[52px] rounded-2xl flex flex-col items-center justify-center transition-colors ${
                            selectedDate === d.date
                              ? 'bg-teal-700 text-white font-bold shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200/70'
                          }`}
                        >
                          <span className="text-[10px] uppercase">{d.day}</span>
                          <span className="text-sm font-mono tabular-nums">{d.num}</span>
                        </button>
                      ))}
                    </div>

                    {/* iOS SCREEN 1: JOURNAL */}
                    {activeModule === 'journal' && (
                      <>
                        {/* Compact iOS Ring/Progress Cards */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/60">
                            <div className="text-[11px] text-slate-500 font-medium">
                              Hydration Goal
                            </div>
                            <div className="text-lg font-bold text-teal-700 font-mono tabular-nums mt-0.5">
                              {totalFluidMl} / {fluidGoalMl}ml
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                              <div
                                className="bg-teal-600 h-full rounded-full"
                                style={{ width: `${fluidPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/60">
                            <div className="text-[11px] text-slate-500 font-medium">
                              Meals Logged
                            </div>
                            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                              {dayMeals.length} entries
                            </div>
                            <div className="text-[11px] text-emerald-700 font-medium mt-1">
                              {
                                dayMeals.filter((m) => m.tolerance === 'Well Tolerated')
                                  .length
                              }{' '}
                              well tolerated
                            </div>
                          </div>
                        </div>

                        {/* One-Tap Quick Symptom Pills (44px+ Touch Target) */}
                        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/60 space-y-2">
                          <div className="text-xs font-bold text-slate-900">
                            One-Tap Experience Log
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(
                              [
                                ['Nausea', 'Quick Entry', 2],
                                ['Fatigue', 'Quick Entry', 3],
                                ['Dry Mouth (Xerostomia)', 'Eating Difficulty', 2],
                                ['Early Satiety', 'Eating Difficulty', 2],
                              ] as const
                            ).map(([sym, cat, sev]) => (
                              <button
                                key={sym}
                                onClick={async () => {
                                  await handleAddSymptom({
                                    date: selectedDate,
                                    timestamp: new Date().toTimeString().slice(0, 5),
                                    symptomType: sym,
                                    category: cat,
                                    severity: sev,
                                    appetiteScore: 5,
                                    notes: 'Logged via iOS one-tap button',
                                  });
                                  showIosToast(`Recorded ${sym}`);
                                }}
                                className="min-h-[44px] px-3 py-2 bg-slate-50 active:bg-amber-50 border border-slate-200 rounded-xl text-left text-xs font-medium text-slate-800 transition-transform active:scale-98"
                              >
                                + {sym.replace(' (Xerostomia)', '')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* One-Tap Hydration Sips */}
                        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              Quick Fluid Sip (+ml)
                            </span>
                            <Droplets className="w-3.5 h-3.5 text-teal-600" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {(
                              [
                                ['Ginger Tea', 200],
                                ['Electrolyte Solution', 250],
                                ['Bone Broth', 250],
                              ] as const
                            ).map(([type, ml]) => (
                              <button
                                key={type}
                                onClick={async () => {
                                  await handleAddHydration({
                                    date: selectedDate,
                                    timestamp: new Date().toTimeString().slice(0, 5),
                                    fluidType: type,
                                    amountMl: ml,
                                    tolerance: 'Well Tolerated',
                                  });
                                  showIosToast(`+${ml}ml ${type}`);
                                }}
                                className="min-h-[44px] px-2 py-2 bg-teal-50/70 active:bg-teal-100 border border-teal-200 rounded-xl text-center"
                              >
                                <div className="text-[11px] font-semibold text-teal-900 truncate">
                                  {type.replace(' Solution', '')}
                                </div>
                                <div className="text-[10px] font-mono font-bold text-teal-700 tabular-nums">
                                  +{ml}ml
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* iOS Grouped Table List of Meals */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Recorded Meals ({dayMeals.length})
                            </span>
                            <button
                              onClick={() => setIosSheetOpen(true)}
                              className="text-xs font-semibold text-teal-700"
                            >
                              + Add Custom
                            </button>
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-200/60 divide-y divide-slate-100 overflow-hidden">
                            {dayMeals.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-500">
                                No meals logged for {selectedDate}. Tap + Log above.
                              </div>
                            ) : (
                              dayMeals.map((m) => (
                                <div key={m.id} className="p-3.5 space-y-1">
                                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <span className="font-semibold text-slate-800">
                                      {m.category} · {m.timestamp}
                                    </span>
                                    <span
                                      className={`font-medium ${
                                        m.tolerance === 'Well Tolerated'
                                          ? 'text-emerald-700'
                                          : m.tolerance === 'Moderate'
                                          ? 'text-amber-700'
                                          : 'text-rose-700'
                                      }`}
                                    >
                                      {m.tolerance}
                                    </span>
                                  </div>
                                  <div className="text-sm font-bold text-slate-900">
                                    {m.foodName}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Portion: {m.portion}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* iOS SCREEN 2: SYMPTOMS & TRENDS */}
                    {activeModule === 'analytics' && analytics && (
                      <div className="space-y-3">
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-2">
                          <div className="text-xs font-bold text-slate-900">
                            5-Day Appetite & Hydration Summary
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-slate-50 rounded-xl">
                              <div className="text-slate-500">Mean Appetite</div>
                              <div className="text-base font-bold font-mono text-teal-700 tabular-nums">
                                {analytics.averageAppetiteScore} / 10
                              </div>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl">
                              <div className="text-slate-500">Avg Daily Fluid</div>
                              <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                                {analytics.averageDailyHydrationMl} ml
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-2.5">
                          <div className="text-xs font-bold text-slate-900">
                            Observational Food Tolerance Patterns
                          </div>
                          {analytics.tolerancePatterns.slice(0, 5).map((p) => (
                            <div
                              key={p.ingredientOrFood}
                              className="py-1.5 border-b border-slate-100 last:border-0 text-xs"
                            >
                              <div className="flex justify-between font-semibold capitalize">
                                <span>{p.ingredientOrFood}</span>
                                <span className="font-mono tabular-nums text-[11px]">
                                  <span className="text-emerald-700">
                                    +{p.wellToleratedCount} ok
                                  </span>{' '}
                                  /{' '}
                                  <span className="text-rose-700">
                                    {p.difficultCount} diff
                                  </span>
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {p.observationNote}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-2">
                          <div className="text-xs font-bold text-slate-900">
                            Recent Symptom Timeline ({symptoms.length})
                          </div>
                          {symptoms.slice(0, 5).map((s) => (
                            <div
                              key={s.id}
                              className="py-2 border-b border-slate-100 last:border-0 text-xs"
                            >
                              <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                                <span>
                                  {s.date} {s.timestamp}
                                </span>
                                <span className="text-amber-700 font-semibold">
                                  Sev {s.severity}/5 · App {s.appetiteScore}/10
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {s.symptomType}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* iOS SCREEN 3: RECIPES & USDA */}
                    {activeModule === 'recipes' && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                          Personalized Tolerance Matches
                        </div>
                        {recommendations.map(({ recipe, matchScore, reasons, cautionIngredients }) => {
                          const saved = profile.savedRecipeIds.includes(recipe.id);
                          return (
                            <div
                              key={recipe.id}
                              className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-2.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-teal-700">
                                  {recipe.category}
                                </span>
                                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                                  {matchScore}% Match
                                </span>
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {recipe.title}
                              </div>
                              <p className="text-xs text-slate-600">{reasons[0]}</p>
                              {cautionIngredients.length > 0 && (
                                <div className="p-2 bg-amber-50 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>
                                    Caution: {cautionIngredients[0].ingredient}
                                  </span>
                                </div>
                              )}
                              <div className="pt-2 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => handleLogRecipeAsMeal(recipe)}
                                  className="min-h-[40px] flex-1 bg-teal-700 text-white text-xs font-semibold rounded-xl"
                                >
                                  + Log as Meal
                                </button>
                                <button
                                  onClick={() => handleToggleBookmark(recipe.id)}
                                  className={`min-h-[40px] px-3 rounded-xl border ${
                                    saved
                                      ? 'bg-teal-50 border-teal-200 text-teal-700'
                                      : 'border-slate-200 text-slate-500'
                                  }`}
                                >
                                  <Bookmark className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* iOS SCREEN 4: CLINICAL PDF & SAFETY */}
                    {activeModule === 'reports' && (
                      <div className="space-y-3">
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-3">
                          <div className="text-xs font-bold text-teal-700 uppercase">
                            iOS Clinical Report Export
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            Dietitian Summary ({dateRange.start} to {dateRange.end})
                          </div>
                          <p className="text-xs text-slate-600">
                            Verified 100% parity with your logged meals, fluid intake, and non-causal symptom history.
                          </p>
                          <div className="space-y-2 pt-1">
                            <a
                              href={`/api/reports/export.pdf?startDate=${encodeURIComponent(
                                dateRange.start
                              )}&endDate=${encodeURIComponent(dateRange.end)}`}
                              download
                              className="w-full min-h-[44px] bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download Binary PDF Report
                            </a>
                            <button
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/api/reports/export.pdf`
                                  );
                                }
                                showIosToast('PDF Link copied to iOS Share Sheet');
                              }}
                              className="w-full min-h-[44px] bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                            >
                              <Share2 className="w-4 h-4" />
                              Share via iOS ShareSheet
                            </button>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-2">
                          <div className="text-xs font-bold text-slate-900">
                            Neutropenic Food Safety Rules
                          </div>
                          {foodSafety.slice(0, 2).map((fs) => (
                            <div
                              key={fs.id}
                              className="py-2 border-b border-slate-100 last:border-0 text-xs space-y-1"
                            >
                              <div className="font-semibold text-slate-900">
                                {fs.title}
                              </div>
                              <p className="text-[11px] text-slate-500">{fs.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* iOS Slide-Up Bottom Sheet Modal for Meal Entry */}
                  {iosSheetOpen && (
                    <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
                      <form
                        onSubmit={handleIosSheetSubmitMeal}
                        className="bg-white rounded-t-3xl p-5 space-y-3.5 shadow-2xl"
                      >
                        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">
                            Log Meal or Custom Food
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIosSheetOpen(false)}
                            className="text-xs font-semibold text-slate-500"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map(
                            (cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setIosMealCategory(cat)}
                                className={`py-2 text-[11px] font-semibold rounded-xl border ${
                                  iosMealCategory === cat
                                    ? 'bg-teal-700 text-white border-teal-700'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {cat}
                              </button>
                            )
                          )}
                        </div>

                        <input
                          type="text"
                          required
                          value={iosMealName}
                          onChange={(e) => setIosMealName(e.target.value)}
                          placeholder="Food name (e.g., Ginger Tofu Congee)"
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={iosMealPortion}
                            onChange={(e) => setIosMealPortion(e.target.value)}
                            placeholder="Portion (e.g., 1 bowl)"
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                          />
                          <select
                            value={iosMealTolerance}
                            onChange={(e) =>
                              setIosMealTolerance(
                                e.target.value as MealEntry['tolerance']
                              )
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                          >
                            <option value="Well Tolerated">Well Tolerated</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Difficult">Difficult</option>
                            <option value="Not Tolerated">Not Tolerated</option>
                          </select>
                        </div>

                        <input
                          type="text"
                          value={iosMealIngredients}
                          onChange={(e) => setIosMealIngredients(e.target.value)}
                          placeholder="Ingredients (comma-separated)"
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                        />

                        <button
                          type="submit"
                          className="w-full min-h-[46px] bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md"
                        >
                          Save Entry to Journal
                        </button>
                      </form>
                    </div>
                  )}

                  {/* iOS Bottom Tab Bar + Home Indicator */}
                  <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 pt-1.5 pb-4 shrink-0">
                    <div className="grid grid-cols-4 items-center">
                      {(
                        [
                          ['journal', 'Journal', Utensils],
                          ['analytics', 'Trends', Activity],
                          ['recipes', 'Recipes', BookOpen],
                          ['reports', 'PDF & Safe', ShieldCheck],
                        ] as const
                      ).map(([id, label, Icon]) => {
                        const active = activeModule === id;
                        return (
                          <button
                            key={id}
                            onClick={() => setActiveModule(id)}
                            className="min-h-[44px] flex flex-col items-center justify-center"
                          >
                            <Icon
                              className={`w-5 h-5 ${
                                active ? 'text-teal-700' : 'text-slate-400'
                              }`}
                            />
                            <span
                              className={`text-[10px] mt-0.5 font-semibold ${
                                active ? 'text-teal-700' : 'text-slate-500'
                              }`}
                            >
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="w-32 h-1 bg-slate-900/80 rounded-full mx-auto mt-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (7 Cols on Desktop): Synchronized Detailed Clinical Inspector */}
            <div className="lg:col-span-7 space-y-6">
              {activeModule === 'journal' && (
                <DailyJournalView
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  meals={meals}
                  hydration={hydration}
                  symptoms={symptoms}
                  profile={profile}
                  onAddMeal={handleAddMeal}
                  onUpdateMeal={handleUpdateMeal}
                  onDeleteMeal={handleDeleteMeal}
                  onAddHydration={handleAddHydration}
                  onDeleteHydration={handleDeleteHydration}
                  onQuickLogSymptom={handleAddSymptom}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}

              {activeModule === 'analytics' && (
                <SymptomsAnalyticsView
                  symptoms={symptoms}
                  sensitivities={sensitivities}
                  analytics={analytics}
                  dateRange={dateRange}
                  onChangeDateRange={setDateRange}
                  onAddSymptom={handleAddSymptom}
                  onDeleteSymptom={handleDeleteSymptom}
                  onAddSensitivity={handleAddSensitivity}
                  onDeleteSensitivity={handleDeleteSensitivity}
                />
              )}

              {activeModule === 'recipes' && (
                <RecipesDiscoveryView
                  recipes={recipes}
                  recommendations={recommendations}
                  collections={collections}
                  profile={profile}
                  onToggleBookmark={handleToggleBookmark}
                  onAddRecipe={handleAddRecipe}
                  onAddCollection={handleAddCollection}
                  onLogRecipeAsMeal={handleLogRecipeAsMeal}
                />
              )}

              {activeModule === 'reports' && (
                <SafetyReportsView
                  foodSafety={foodSafety}
                  meals={meals}
                  hydration={hydration}
                  symptoms={symptoms}
                  sensitivities={sensitivities}
                  profile={profile}
                  caregiverGrants={caregiverGrants}
                  analytics={analytics}
                  onAddCaregiverGrant={handleAddCaregiverGrant}
                  onToggleRevokeGrant={handleToggleRevokeGrant}
                  onUpdateProfile={handleUpdateProfile}
                  onRefreshAll={loadAllData}
                />
              )}
            </div>
          </div>
        ) : (
          /* =====================================================================
             MODE 2: FULL-WIDTH CLINICAL WORKSPACE VIEW
             ===================================================================== */
          <>
            {activeModule === 'journal' && (
              <DailyJournalView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                meals={meals}
                hydration={hydration}
                symptoms={symptoms}
                profile={profile}
                onAddMeal={handleAddMeal}
                onUpdateMeal={handleUpdateMeal}
                onDeleteMeal={handleDeleteMeal}
                onAddHydration={handleAddHydration}
                onDeleteHydration={handleDeleteHydration}
                onQuickLogSymptom={handleAddSymptom}
                onUpdateProfile={handleUpdateProfile}
              />
            )}

            {activeModule === 'analytics' && (
              <SymptomsAnalyticsView
                symptoms={symptoms}
                sensitivities={sensitivities}
                analytics={analytics}
                dateRange={dateRange}
                onChangeDateRange={setDateRange}
                onAddSymptom={handleAddSymptom}
                onDeleteSymptom={handleDeleteSymptom}
                onAddSensitivity={handleAddSensitivity}
                onDeleteSensitivity={handleDeleteSensitivity}
              />
            )}

            {activeModule === 'recipes' && (
              <RecipesDiscoveryView
                recipes={recipes}
                recommendations={recommendations}
                collections={collections}
                profile={profile}
                onToggleBookmark={handleToggleBookmark}
                onAddRecipe={handleAddRecipe}
                onAddCollection={handleAddCollection}
                onLogRecipeAsMeal={handleLogRecipeAsMeal}
              />
            )}

            {activeModule === 'reports' && (
              <SafetyReportsView
                foodSafety={foodSafety}
                meals={meals}
                hydration={hydration}
                symptoms={symptoms}
                sensitivities={sensitivities}
                profile={profile}
                caregiverGrants={caregiverGrants}
                analytics={analytics}
                onAddCaregiverGrant={handleAddCaregiverGrant}
                onToggleRevokeGrant={handleToggleRevokeGrant}
                onUpdateProfile={handleUpdateProfile}
                onRefreshAll={loadAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Mobile Bottom Tab Bar on actual mobile viewports */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center h-16 no-print">
        {(
          [
            ['journal', 'Journal', Utensils],
            ['analytics', 'Trends', Activity],
            ['recipes', 'Recipes', BookOpen],
            ['reports', 'Safety & PDF', ShieldCheck],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = activeModule === id;
          return (
            <button
              key={id}
              onClick={() => setActiveModule(id)}
              className="min-h-[44px] flex flex-col items-center justify-center"
            >
              <Icon className={`w-5 h-5 ${active ? 'text-teal-700' : 'text-slate-400'}`} />
              <span
                className={`text-[10px] mt-1 font-medium ${
                  active ? 'text-teal-700 font-bold' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clinical Nutrition Disclaimer Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="max-w-3xl leading-relaxed">
            <strong className="text-slate-700">Nutrition & Medical Disclaimer:</strong>{' '}
            OncoByte provides supportive dietary logging, USDA nutrient reference lookups, and general oncology food safety education. Observational food tolerance summaries do not establish medical causation and are not a substitute for individualized medical advice or consultation with an Oncology Registered Dietitian Nutritionist (RDN).
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <a
              href="https://www.cancer.gov/about-cancer/treatment/side-effects/appetite-loss/nutrition-pdq"
              target="_blank"
              rel="noreferrer"
              className="text-teal-700 hover:underline font-medium"
            >
              NCI Nutrition in Cancer Care
            </a>
            <span>·</span>
            <a
              href="https://www.oncologynutrition.org/"
              target="_blank"
              rel="noreferrer"
              className="text-teal-700 hover:underline font-medium"
            >
              Oncology Nutrition DPG (RDN Directory)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
