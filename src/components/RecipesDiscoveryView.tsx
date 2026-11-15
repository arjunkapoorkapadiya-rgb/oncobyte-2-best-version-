/**
 * ============================================================================
 * ONCOBYTE RECIPE DISCOVERY, RECOMMENDATION & USDA LOOKUP (src/components/RecipesDiscoveryView.tsx)
 * ============================================================================
 * Tasks Completed in this File:
 *   - TASK 32: Recipe Search (By recipe title and normalized ingredient token)
 *   - TASK 33: Recipe Filtering (Prep time slider, clinical category, Neutropenic-Safe)
 *   - TASK 34: Recipe Detail Pages (Ingredients, steps, source verification, warnings)
 *   - TASK 35: Recipe Discovery Interface
 *   - TASK 36: Saved Recipes (Bookmark toggle & saved list)
 *   - TASK 37: Personal Recipe Collections (Custom treatment-phase folders)
 *   - TASK 38: Custom Recipe Submission (Auto-normalizes ingredients)
 *   - TASK 41: Recipe Recommendation Interface (Match % score badges)
 *   - TASK 42: Recipe Recommendation Explanations & Caution Ingredient Callouts
 *   - TASK 43 & 44: USDA FoodData Central Ingredient Nutrition Lookup Table
 *   - TASK 45: Supportive Nutrition Information Display
 *   - TASK 48: Recipe Source Verification Links (NCI, MSKCC, AICR, Dana-Farber)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Recipe,
  RecipeRecommendation,
  RecipeCollection,
  USDAFoodNutrient,
  UserProfile,
} from '../types/oncobyte';
import {
  Search,
  Bookmark,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
  FolderPlus,
  Database,
  ChefHat,
  Info,
} from 'lucide-react';

interface RecipesDiscoveryViewProps {
  recipes: Recipe[];
  recommendations: RecipeRecommendation[];
  collections: RecipeCollection[];
  profile: UserProfile;
  onToggleBookmark: (recipeId: string) => Promise<void>;
  onAddRecipe: (recipe: Partial<Recipe>) => Promise<void>;
  onAddCollection: (col: Partial<RecipeCollection>) => Promise<void>;
  onLogRecipeAsMeal: (recipe: Recipe) => Promise<void>;
}

const CATEGORIES = [
  'All',
  'Nausea-Calming',
  'Soft Texture / Dysphagia-Friendly',
  'High-Protein Gentle',
  'Nutrient-Dense Snack',
];

export const RecipesDiscoveryView: React.FC<RecipesDiscoveryViewProps> = ({
  recipes,
  recommendations,
  collections,
  profile,
  onToggleBookmark,
  onAddRecipe,
  onAddCollection,
  onLogRecipeAsMeal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'recommended' | 'browse' | 'saved' | 'usda'
  >('recommended');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxTotalMinutes, setMaxTotalMinutes] = useState<number>(60);
  const [onlyNeutropenicSafe, setOnlyNeutropenicSafe] = useState(false);

  // Selected Recipe Detail Modal
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loggedBanner, setLoggedBanner] = useState<string | null>(null);

  // Custom Recipe Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Recipe['category']>('High-Protein Gentle');
  const [newTexture, setNewTexture] = useState<Recipe['textureProfile']>('Soft & Moist');
  const [newPrep, setNewPrep] = useState(10);
  const [newCook, setNewCook] = useState(15);
  const [newIngredients, setNewIngredients] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  // New Collection Form
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');

  // USDA FoodData Central Search
  const [usdaQuery, setUsdaQuery] = useState('');
  const [usdaResults, setUsdaResults] = useState<USDAFoodNutrient[]>([]);
  const [usdaLoading, setUsdaLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchUsda = async () => {
      setUsdaLoading(true);
      try {
        const res = await fetch(
          `/api/usda/search?query=${encodeURIComponent(usdaQuery)}`
        );
        if (res.ok && active) {
          const data = await res.json();
          setUsdaResults(data);
        }
      } finally {
        if (active) setUsdaLoading(false);
      }
    };
    fetchUsda();
    return () => {
      active = false;
    };
  }, [usdaQuery]);

  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ingredients.some((i) =>
        i.normalizedName.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === 'All' || r.category === selectedCategory;

    const matchesTime = r.prepTimeMinutes + r.cookTimeMinutes <= maxTotalMinutes;

    const matchesNeutropenic =
      !onlyNeutropenicSafe || r.dietaryTags.includes('Neutropenic-Safe');

    return matchesSearch && matchesCategory && matchesTime && matchesNeutropenic;
  });

  const savedRecipesList = recipes.filter((r) =>
    profile.savedRecipeIds.includes(r.id)
  );

  const handleCreateCustomRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onAddRecipe({
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCategory,
      textureProfile: newTexture,
      prepTimeMinutes: newPrep,
      cookTimeMinutes: newCook,
      ingredients: newIngredients as any,
      instructions: newInstructions as any,
    });
    setNewTitle('');
    setNewDesc('');
    setNewIngredients('');
    setNewInstructions('');
    setShowCustomModal(false);
    setActiveSubTab('browse');
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    await onAddCollection({
      name: newCollectionName.trim(),
      description: newCollectionDesc.trim(),
      recipeIds: profile.savedRecipeIds.slice(0, 2),
    });
    setNewCollectionName('');
    setNewCollectionDesc('');
  };

  const handleLogMealFromRecipe = async (recipe: Recipe) => {
    await onLogRecipeAsMeal(recipe);
    setLoggedBanner(`Added "${recipe.title}" to today's Daily Nutrition Journal.`);
    setTimeout(() => setLoggedBanner(null), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Header + Sub-navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Oncology Recipe Discovery, Tolerance Matching & USDA Lookup
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Personalized recipe recommendations matched against your logged food tolerances, texture needs, and food safety precautions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveSubTab('recommended')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'recommended'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personalized Matches ({recommendations.length})
            </button>
            <button
              onClick={() => setActiveSubTab('browse')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'browse'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Search & Filter ({recipes.length})
            </button>
            <button
              onClick={() => setActiveSubTab('saved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'saved'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved & Collections ({savedRecipesList.length})
            </button>
            <button
              onClick={() => setActiveSubTab('usda')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'usda'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              USDA Ingredient Lookup
            </button>
          </div>

          <button
            onClick={() => setShowCustomModal(!showCustomModal)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Submit Custom Recipe
          </button>
        </div>
      </div>

      {loggedBanner && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-xs font-medium text-teal-900 flex items-center justify-between">
          <span>{loggedBanner}</span>
          <button onClick={() => setLoggedBanner(null)} className="text-teal-700 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Custom Recipe Submission Form */}
      {showCustomModal && (
        <form
          onSubmit={handleCreateCustomRecipe}
          className="bg-white border border-teal-600 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Add Personal Recipe to Library (Auto-Normalizes Ingredients)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Recipe Title *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Warm Oat & Banana Mash with Ginger"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clinical Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Recipe['category'])}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Nausea-Calming">Nausea-Calming</option>
                <option value="Soft Texture / Dysphagia-Friendly">
                  Soft Texture / Dysphagia-Friendly
                </option>
                <option value="High-Protein Gentle">High-Protein Gentle</option>
                <option value="Nutrient-Dense Snack">Nutrient-Dense Snack</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Texture Profile
              </label>
              <select
                value={newTexture}
                onChange={(e) =>
                  setNewTexture(e.target.value as Recipe['textureProfile'])
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Smooth / Pureed">Smooth / Pureed</option>
                <option value="Soft & Moist">Soft & Moist</option>
                <option value="Room Temperature">Room Temperature</option>
                <option value="Clear Liquid">Clear Liquid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Prep Time (mins)
              </label>
              <input
                type="number"
                value={newPrep}
                onChange={(e) => setNewPrep(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cook Time (mins)
              </label>
              <input
                type="number"
                value={newCook}
                onChange={(e) => setNewCook(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Why this recipe works well for your appetite or symptoms..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ingredients (one per line — pipeline normalizes names automatically)
              </label>
              <textarea
                rows={4}
                value={newIngredients}
                onChange={(e) => setNewIngredients(e.target.value)}
                placeholder={'1/2 cup rolled oats\n1 ripe banana, mashed\n1 cup oat milk'}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Preparation Steps (one step per line)
              </label>
              <textarea
                rows={4}
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder={'Simmer oats in oat milk for 5 minutes.\nStir in mashed banana and cool to lukewarm.'}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCustomModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Save to Personal Library
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: Personalized Recommendations & Explanations */}
      {activeSubTab === 'recommended' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">
                How OncoByte Matches Recipes to Your Logs
              </div>
              <p className="text-xs text-slate-600">
                Our recommendation engine cross-references normalized recipe ingredients against your{' '}
                <span className="font-medium text-slate-800">Well Tolerated meals</span>,{' '}
                <span className="font-medium text-slate-800">logged sensitivities</span> (e.g., Garlic, Chili Oil, Acidic Tomatoes), and{' '}
                <span className="font-medium text-slate-800">active Neutropenic precautions</span>.
              </p>
            </div>
            <span className="text-xs font-mono text-teal-700 shrink-0 tabular-nums">
              {recommendations.filter((r) => r.cautionIngredients.length === 0).length} High-Comfort Matches
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recommendations.map(({ recipe, matchScore, reasons, cautionIngredients }) => {
              const isBookmarked = profile.savedRecipeIds.includes(recipe.id);
              const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

              return (
                <div
                  key={recipe.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    {/* Unboxed metadata header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-teal-700">
                          {recipe.category}
                        </span>
                        <span>·</span>
                        <span>{recipe.textureProfile}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {totalTime}m total
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            matchScore >= 80
                              ? 'text-emerald-700'
                              : matchScore >= 60
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {matchScore}% Tolerance Match
                        </span>
                        <button
                          onClick={() => onToggleBookmark(recipe.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isBookmarked
                              ? 'bg-teal-50 border-teal-200 text-teal-700'
                              : 'border-slate-200 text-slate-400 hover:text-slate-700'
                          }`}
                          title="Save Recipe"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{recipe.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {recipe.description}
                    </p>

                    {/* Recommendation Explanations */}
                    <div className="pt-2 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-800">
                        Why This Recipe Was Ranked for You:
                      </div>
                      {reasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-emerald-800"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))}

                      {cautionIngredients.map((caution, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50/70 p-2 rounded-lg"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong className="capitalize">{caution.ingredient}:</strong>{' '}
                            {caution.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-mono text-slate-500 tabular-nums">
                      Protein: {recipe.nutritionHighlight.proteinG}g · Fiber:{' '}
                      {recipe.nutritionHighlight.fiberG}g · Hydration:{' '}
                      {recipe.nutritionHighlight.hydrationSupport}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLogMealFromRecipe(recipe)}
                        className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                      >
                        + Log as Meal
                      </button>
                      <button
                        onClick={() => setSelectedRecipe(recipe)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        View Instructions & Safety
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Browse, Search & Multi-Facet Filter */}
      {activeSubTab === 'browse' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by recipe name or normalized ingredient (e.g., ginger, tofu, oats)..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <span className="text-xs text-slate-500 shrink-0">Max Total Time:</span>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={maxTotalMinutes}
                  onChange={(e) => setMaxTotalMinutes(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
                <span className="text-xs font-mono font-semibold text-slate-800 tabular-nums shrink-0">
                  ≤ {maxTotalMinutes}m
                </span>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyNeutropenicSafe}
                    onChange={(e) => setOnlyNeutropenicSafe(e.target.checked)}
                    className="rounded text-teal-700"
                  />
                  <span>Neutropenic-Safe Only</span>
                </label>
              </div>
            </div>

            {/* Interactive Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedCategory === cat
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRecipes.map((recipe) => {
              const isBookmarked = profile.savedRecipeIds.includes(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {recipe.category} · {recipe.textureProfile} ·{' '}
                        <span className="font-mono tabular-nums">
                          {recipe.prepTimeMinutes + recipe.cookTimeMinutes}m
                        </span>
                      </span>
                      <button
                        onClick={() => onToggleBookmark(recipe.id)}
                        className={`p-1.5 rounded-lg border ${
                          isBookmarked
                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                            : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{recipe.title}</h3>
                    <p className="text-xs text-slate-600">{recipe.description}</p>
                    <p className="text-xs text-slate-500 pt-1">
                      <span className="font-medium text-slate-700">
                        Standardized Ingredients:
                      </span>{' '}
                      {recipe.ingredients.map((i) => i.normalizedName).join(', ')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Source: {recipe.sourceName}
                    </span>
                    <button
                      onClick={() => setSelectedRecipe(recipe)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-lg"
                    >
                      Open Recipe Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Saved Bookmarks & Personal Recipe Collections */}
      {activeSubTab === 'saved' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Bookmarked Recipes ({savedRecipesList.length})
            </h2>
            {savedRecipesList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-xs text-slate-500">
                No bookmarked recipes yet. Click the bookmark icon on any recipe card to save it here.
              </div>
            ) : (
              <div className="space-y-4">
                {savedRecipesList.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs text-slate-500">
                        {r.category} · {r.textureProfile}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {r.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        {r.nutritionHighlight.gentleDigestibilityNote}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedRecipe(r)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 rounded-lg"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onToggleBookmark(r.id)}
                        className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Personal Recipe Collections
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Organize recipes by treatment phase (e.g., Infusion Week Comforts, High-Protein Recovery).
              </p>

              <form onSubmit={handleCreateCollection} className="space-y-3">
                <input
                  type="text"
                  required
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection Name (e.g., Easy Sipping Soups)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Create Collection from Saved Recipes
                </button>
              </form>

              <div className="divide-y divide-slate-100 pt-2">
                {collections.map((col) => (
                  <div key={col.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{col.name}</span>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {col.recipeIds.length} recipes
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{col.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USDA FoodData Central Ingredient Nutrition Lookup */}
      {activeSubTab === 'usda' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  USDA FoodData Central — Oncology Ingredient Nutrition Lookup
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect protein, fiber, potassium, calcium, and iron profiles for core ingredients without emphasizing restrictive calorie counting.
                </p>
              </div>
            </div>

            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={usdaQuery}
                onChange={(e) => setUsdaQuery(e.target.value)}
                placeholder="Search USDA ingredient (oats, tofu, ginger, egg)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {usdaLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Querying USDA FoodData Central records...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 pr-4 font-semibold">FDC ID</th>
                    <th className="py-2.5 px-4 font-semibold">Standardized Ingredient</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Protein</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Fiber</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Potassium</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Iron</th>
                    <th className="py-2.5 pl-4 font-semibold">Oncology Culinary & Safety Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {usdaResults.map((item) => (
                    <tr key={item.fdcId} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-mono text-slate-500 tabular-nums">
                        #{item.fdcId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.category} · Serving: {item.servingSize}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-teal-700 tabular-nums">
                        {item.proteinG}g
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {item.fiberG}g
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {item.potassiumMg}mg
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {item.ironMg}mg
                      </td>
                      <td className="py-3 pl-4 text-slate-600 max-w-md">
                        {item.clinicalNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 my-8 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs text-teal-700 font-semibold">
                  {selectedRecipe.category} · {selectedRecipe.textureProfile}
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedRecipe.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1 font-mono tabular-nums">
                  <span>Prep: {selectedRecipe.prepTimeMinutes}m</span>
                  <span>·</span>
                  <span>Cook: {selectedRecipe.cookTimeMinutes}m</span>
                  <span>·</span>
                  <span>Servings: {selectedRecipe.servings}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>

            {/* Food Safety & Treatment Considerations */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Food Safety & Oncology Treatment Considerations</span>
              </div>
              <ul className="list-disc pl-5 text-xs text-amber-900 space-y-1">
                {selectedRecipe.foodSafetyWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {selectedRecipe.treatmentConsiderations.map((t, i) => (
                  <li key={`tc_${i}`}>{t}</li>
                ))}
              </ul>
              {selectedRecipe.allergens.length > 0 && (
                <div className="text-xs text-rose-800 font-medium pt-1">
                  Declared Allergens: {selectedRecipe.allergens.join(', ')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  Normalized Ingredients
                </h3>
                <ul className="divide-y divide-slate-100 text-xs">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="py-2 flex items-center justify-between gap-2">
                      <span className="text-slate-800">{ing.rawText}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        [{ing.normalizedName}]
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  Step-by-Step Preparation
                </h3>
                <ol className="space-y-2.5 text-xs text-slate-700 list-decimal pl-4">
                  {selectedRecipe.instructions.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Source Attribution & Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>
                  Verified Source:{' '}
                  <strong className="text-slate-700">{selectedRecipe.sourceName}</strong>
                </span>
                {selectedRecipe.sourceUrl.startsWith('http') && (
                  <a
                    href={selectedRecipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                  >
                    Source Link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleLogMealFromRecipe(selectedRecipe);
                    setSelectedRecipe(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Log Recipe in Daily Journal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
