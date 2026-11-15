/**
 * ============================================================================
 * ONCOBYTE SYMPTOM TRACKING & TREND ANALYTICS (src/components/SymptomsAnalyticsView.tsx)
 * ============================================================================
 * Tasks Completed in this File:
 *   - TASK 15: Symptom Logging (Nausea, fatigue, taste changes, appetite loss)
 *   - TASK 16: Appetite Tracking (1-10 self-reported appetite scale over time)
 *   - TASK 17: Eating Difficulty Tracking (Dysphagia, dry mouth, early satiety)
 *   - TASK 18: Food Sensitivity Tracking (Personal aversion & trigger registry)
 *   - TASK 19: Symptom History Interface (Chronological timeline)
 *   - TASK 20: Symptom Trend Analysis Visualization
 *   - TASK 21: Appetite Trend Analysis Visualization
 *   - TASK 22: Food Tolerance Analysis (Observational, non-causal pattern table)
 *   - TASK 23: Patient Tracking Dashboard KPI Summary
 *   - TASK 24: Multi-Day Data Visualization Charts (Hydration, Meals, Appetite)
 *   - TASK 25: Date Range Filtering Controls
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  SymptomEntry,
  FoodSensitivityRecord,
  AnalyticsSummary,
  SeverityLevel,
} from '../types/oncobyte';
import {
  Activity,
  Plus,
  Trash2,
  TrendingUp,
  Info,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface SymptomsAnalyticsViewProps {
  symptoms: SymptomEntry[];
  sensitivities: FoodSensitivityRecord[];
  analytics: AnalyticsSummary | null;
  dateRange: { start: string; end: string };
  onChangeDateRange: (range: { start: string; end: string }) => void;
  onAddSymptom: (sym: Partial<SymptomEntry>) => Promise<void>;
  onDeleteSymptom: (id: string) => Promise<void>;
  onAddSensitivity: (sens: Partial<FoodSensitivityRecord>) => Promise<void>;
  onDeleteSensitivity: (id: string) => Promise<void>;
}

const SYMPTOM_TYPES: SymptomEntry['symptomType'][] = [
  'Nausea',
  'Fatigue',
  'Taste Changes (Metallic/Bitter)',
  'Appetite Loss',
  'Swallowing Difficulty (Dysphagia)',
  'Dry Mouth (Xerostomia)',
  'Mouth Sores (Mucositis)',
  'Early Satiety',
  'Food Aversion',
  'Gastrointestinal Discomfort',
];

export const SymptomsAnalyticsView: React.FC<SymptomsAnalyticsViewProps> = ({
  symptoms,
  sensitivities,
  analytics,
  dateRange,
  onChangeDateRange,
  onAddSymptom,
  onDeleteSymptom,
  onAddSensitivity,
  onDeleteSensitivity,
}) => {
  // Symptom form state
  const [symptomType, setSymptomType] = useState<SymptomEntry['symptomType']>('Nausea');
  const [category, setCategory] = useState<SymptomEntry['category']>('Symptom');
  const [severity, setSeverity] = useState<SeverityLevel>(2);
  const [appetiteScore, setAppetiteScore] = useState<number>(6);
  const [triggeredByFood, setTriggeredByFood] = useState('');
  const [notes, setNotes] = useState('');
  const [symDate, setSymDate] = useState('2026-11-15');

  // Sensitivity form state
  const [foodOrIngredient, setFoodOrIngredient] = useState('');
  const [reactionType, setReactionType] =
    useState<FoodSensitivityRecord['reactionType']>('Nausea Trigger');
  const [toleranceStatus, setToleranceStatus] =
    useState<FoodSensitivityRecord['toleranceStatus']>('Avoid');
  const [sensNotes, setSensNotes] = useState('');

  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddSymptom({
      date: symDate,
      timestamp: new Date().toTimeString().slice(0, 5),
      symptomType,
      category,
      severity,
      appetiteScore,
      triggeredByFood: triggeredByFood.trim(),
      notes: notes.trim(),
    });
    setTriggeredByFood('');
    setNotes('');
  };

  const handleSensitivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodOrIngredient.trim()) return;
    await onAddSensitivity({
      foodOrIngredient: foodOrIngredient.trim(),
      reactionType,
      toleranceStatus,
      notes: sensNotes.trim(),
    });
    setFoodOrIngredient('');
    setSensNotes('');
  };

  return (
    <div className="space-y-8">
      {/* Header + Date Range Filtering */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Patient Tracking Dashboard & Symptom Trends
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Monitor appetite changes, swallowing comfort, symptom frequency, and non-causal food tolerance patterns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Date Range:</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => onChangeDateRange({ ...dateRange, start: e.target.value })}
            className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => onChangeDateRange({ ...dateRange, end: e.target.value })}
            className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
          />
          <button
            onClick={() => onChangeDateRange({ start: '2026-11-11', end: '2026-11-15' })}
            className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Last 5 Days
          </button>
        </div>
      </div>

      {/* Consolidated Patient KPI Row */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">Total Meals in Period</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {analytics.totalMeals}
              </span>
              <span className="text-xs text-emerald-700 font-mono tabular-nums">
                {analytics.toleranceBreakdown.wellTolerated} well tolerated
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">Avg Daily Fluid Intake</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-teal-700 font-mono tabular-nums">
                {analytics.averageDailyHydrationMl} ml
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {analytics.hydrationGoalCompletionPct}% of goal
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">Mean Appetite Score</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {analytics.averageAppetiteScore} / 10
              </span>
              <span className="text-xs text-slate-500">Self-reported scale</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">Tolerance Distribution</div>
            <div className="mt-2 flex items-center gap-3 text-xs font-mono tabular-nums">
              <span className="text-emerald-700">
                Well: {analytics.toleranceBreakdown.wellTolerated}
              </span>
              <span>·</span>
              <span className="text-amber-700">
                Mod: {analytics.toleranceBreakdown.moderate}
              </span>
              <span>·</span>
              <span className="text-rose-700">
                Diff: {analytics.toleranceBreakdown.difficult + analytics.toleranceBreakdown.notTolerated}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Data Visualizations: Multi-Day Timeline Charts (Hydration, Appetite & Symptom Severity) */}
      {analytics && analytics.dailyTimeline.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Daily Hydration & Meal Frequency */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Hydration & Meal Frequency Timeline
                </h2>
                <p className="text-xs text-slate-500">
                  Daily fluid volume (ml) alongside recorded meals and snacks.
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-teal-700" />
            </div>

            <div className="space-y-3">
              {analytics.dailyTimeline.map((day) => {
                const widthPct = Math.min(100, Math.round((day.hydrationMl / 2200) * 100));
                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-700 font-medium">{day.date}</span>
                      <span className="text-slate-600">
                        {day.hydrationMl} ml · {day.mealCount} meals
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Appetite Trend vs Symptom Severity */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Appetite Score vs. Symptom Severity Trend
                </h2>
                <p className="text-xs text-slate-500">
                  Appetite (1–10 scale) compared against mean symptom intensity (1–5 scale).
                </p>
              </div>
              <Activity className="w-4 h-4 text-amber-600" />
            </div>

            <div className="space-y-3">
              {analytics.dailyTimeline.map((day) => {
                const appetitePct = Math.min(100, Math.round((day.avgAppetite / 10) * 100));
                const sevPct = Math.min(100, Math.round((day.avgSymptomSeverity / 5) * 100));
                return (
                  <div key={day.date} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-700 font-medium">{day.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-teal-700">Appetite: {day.avgAppetite}/10</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-amber-700">
                          Symptom Severity: {day.avgSymptomSeverity}/5
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full"
                          style={{ width: `${appetitePct}%` }}
                        />
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${sevPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Food Tolerance Pattern Analysis (Observational, Non-Causal) */}
      {analytics && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Observational Food Tolerance & Ingredient Pattern Analysis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifies recurring ingredients across your logged meals to support conversations with your registered oncology dietitian.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Observational correlation only — does not establish medical causation</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Ingredient / Food Item</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Well Tolerated Logs</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Difficult / Aversion Logs</th>
                  <th className="py-2.5 pl-4 font-semibold">Pattern Observation Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {analytics.tolerancePatterns.map((pat) => (
                  <tr key={pat.ingredientOrFood} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-medium text-slate-900 capitalize">
                      {pat.ingredientOrFood}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                      {pat.wellToleratedCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-rose-700">
                      {pat.difficultCount}
                    </td>
                    <td className="py-2.5 pl-4 text-slate-600">{pat.observationNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2-Column Split: Log Symptom / Appetite + Manage Food Sensitivities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Symptom & Eating Difficulty Logging + Timeline */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSymptomSubmit}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              Record Symptom, Appetite Change, or Eating Difficulty
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Symptom or Eating Challenge
                </label>
                <select
                  value={symptomType}
                  onChange={(e) =>
                    setSymptomType(e.target.value as SymptomEntry['symptomType'])
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {SYMPTOM_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={symDate}
                  onChange={(e) => setSymDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SymptomEntry['category'])}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Symptom">Nutrition Symptom</option>
                  <option value="Eating Difficulty">Swallowing / Eating Difficulty</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Severity (1 Mild – 5 Severe):{' '}
                  <span className="font-mono font-bold text-amber-700">{severity}/5</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value) as SeverityLevel)}
                  className="w-full accent-teal-700 mt-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Appetite Level (1 Low – 10 Strong):{' '}
                  <span className="font-mono font-bold text-teal-700">{appetiteScore}/10</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={appetiteScore}
                  onChange={(e) => setAppetiteScore(Number(e.target.value))}
                  className="w-full accent-teal-700 mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Associated Food or Odor (Optional)
                </label>
                <input
                  type="text"
                  value={triggeredByFood}
                  onChange={(e) => setTriggeredByFood(e.target.value)}
                  placeholder="e.g., Garlic aroma, dry toast"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Management Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Switched to bamboo spoon; sipped ginger tea"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Save Symptom Entry
              </button>
            </div>
          </form>

          {/* Symptom History Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Chronological Symptom & Eating Difficulty Timeline ({symptoms.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {symptoms.map((sym) => (
                <div
                  key={sym.id}
                  className="py-3.5 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-slate-500">
                      <span className="font-mono tabular-nums">{sym.date}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {sym.timestamp}
                      </span>
                      <span>·</span>
                      <span>{sym.category}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums font-medium text-amber-700">
                        Severity {sym.severity}/5
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-teal-700">
                        Appetite {sym.appetiteScore}/10
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {sym.symptomType}
                    </div>
                    {sym.triggeredByFood && (
                      <div className="text-slate-600">
                        <span className="font-medium">Context / Trigger:</span>{' '}
                        {sym.triggeredByFood}
                      </div>
                    )}
                    {sym.notes && <div className="text-slate-500 italic">{sym.notes}</div>}
                  </div>
                  <button
                    onClick={() => onDeleteSymptom(sym.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete symptom log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Food Sensitivity & Aversion Registry */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">
                Personal Food Sensitivity & Aversion Tracker
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Foods logged here automatically calibrate your Recipe Recommendation Engine to flag or avoid uncomfortable ingredients.
            </p>

            <form onSubmit={handleSensitivitySubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Food or Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  value={foodOrIngredient}
                  onChange={(e) => setFoodOrIngredient(e.target.value)}
                  placeholder="e.g., Raw Onion, Citrus Juice, Dry Crackers"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Experience Type
                  </label>
                  <select
                    value={reactionType}
                    onChange={(e) =>
                      setReactionType(
                        e.target.value as FoodSensitivityRecord['reactionType']
                      )
                    }
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Nausea Trigger">Nausea Trigger</option>
                    <option value="Aversion">Smell / Taste Aversion</option>
                    <option value="Mouth Irritation">Mouth Sore Irritation</option>
                    <option value="Texture Difficulty">Swallowing / Texture Issue</option>
                    <option value="GI Intolerance">GI Discomfort</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Matching Rule
                  </label>
                  <select
                    value={toleranceStatus}
                    onChange={(e) =>
                      setToleranceStatus(
                        e.target.value as FoodSensitivityRecord['toleranceStatus']
                      )
                    }
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Avoid">Avoid in Recipes</option>
                    <option value="Caution">Flag with Caution</option>
                    <option value="Well Tolerated">Safe / Well Tolerated</option>
                  </select>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={sensNotes}
                  onChange={(e) => setSensNotes(e.target.value)}
                  placeholder="Optional note on preparation or symptoms"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
              >
                Add to Sensitivity Profile
              </button>
            </form>

            <div className="divide-y divide-slate-100 pt-3">
              {sensitivities.map((sens) => (
                <div
                  key={sens.id}
                  className="py-3 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {sens.foodOrIngredient}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span
                        className={`font-medium ${
                          sens.toleranceStatus === 'Avoid'
                            ? 'text-rose-700'
                            : sens.toleranceStatus === 'Caution'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {sens.toleranceStatus}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      {sens.reactionType} · Reported {sens.occurrenceCount}x (Last:{' '}
                      <span className="font-mono tabular-nums">{sens.lastReported}</span>)
                    </div>
                    {sens.notes && <p className="text-slate-600 mt-0.5">{sens.notes}</p>}
                  </div>
                  <button
                    onClick={() => onDeleteSensitivity(sens.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Remove sensitivity record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
