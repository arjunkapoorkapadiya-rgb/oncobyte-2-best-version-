/**
 * ============================================================================
 * ONCOBYTE iOS MOBILE APP — SHARED TYPESCRIPT SDK & NETWORK CLIENT
 * File: /ios-react-native/api/OncoByteApiClient.ts
 * ============================================================================
 * Tasks Completed in this File:
 *   - TASK 63: Bearer JWT Token Header Management for iOS Sessions
 *   - TASK 65 & 66: Typed Client Methods for all OncoByte REST Endpoints
 *   - TASK 70: Data Synchronization between iOS Client and Backend Store
 *   - TASK 71: Exponential Backoff Retry Algorithm (`250ms * 2^attempt`) for
 *              resilient mobile network recovery
 *
 * MAC / XCODE TEAM HANDOFF NOTE:
 *   When testing on a physical iPhone over Wi-Fi, pass your Mac's LAN IP
 *   (e.g., `new OncoByteApiClient("http://192.168.1.50:3000")`) or the deployed
 *   Cloud Run URL via `EXPO_PUBLIC_API_URL`.
 * ============================================================================
 */

import type {
  MealEntry,
  HydrationEntry,
  SymptomEntry,
  FoodSensitivityRecord,
  Recipe,
  RecipeRecommendation,
  USDAFoodNutrient,
  UserProfile,
  AnalyticsSummary,
} from '../../src/types/oncobyte';

export interface AuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    treatmentContext: string;
  };
}

export class OncoByteApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Retry logic with exponential backoff for mobile network resilience
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers,
        });
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${response.status}`);
        }
        return (await response.json()) as T;
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 250 * Math.pow(2, attempt)));
      }
    }
    throw lastError || new Error('Network request failed');
  }

  // --- Authentication ---
  public async login(email: string, password: string): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.authToken = session.token;
    return session;
  }

  public async register(payload: {
    name: string;
    email: string;
    password: string;
    treatmentContext?: string;
  }): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.authToken = session.token;
    return session;
  }

  // --- Profile & Preferences ---
  public getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile');
  }

  public updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Meals ---
  public getMeals(date?: string): Promise<MealEntry[]> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<MealEntry[]>(`/api/meals${q}`);
  }

  public addMeal(meal: Partial<MealEntry>): Promise<MealEntry> {
    return this.request<MealEntry>('/api/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    });
  }

  public updateMeal(id: string, meal: Partial<MealEntry>): Promise<MealEntry> {
    return this.request<MealEntry>(`/api/meals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meal),
    });
  }

  public deleteMeal(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/api/meals/${id}`, { method: 'DELETE' });
  }

  // --- Hydration ---
  public getHydration(date?: string): Promise<HydrationEntry[]> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<HydrationEntry[]>(`/api/hydration${q}`);
  }

  public addHydration(hyd: Partial<HydrationEntry>): Promise<HydrationEntry> {
    return this.request<HydrationEntry>('/api/hydration', {
      method: 'POST',
      body: JSON.stringify(hyd),
    });
  }

  // --- Symptoms & Sensitivities ---
  public getSymptoms(date?: string): Promise<SymptomEntry[]> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<SymptomEntry[]>(`/api/symptoms${q}`);
  }

  public addSymptom(sym: Partial<SymptomEntry>): Promise<SymptomEntry> {
    return this.request<SymptomEntry>('/api/symptoms', {
      method: 'POST',
      body: JSON.stringify(sym),
    });
  }

  public getSensitivities(): Promise<FoodSensitivityRecord[]> {
    return this.request<FoodSensitivityRecord[]>('/api/sensitivities');
  }

  // --- Analytics & Trends ---
  public getAnalytics(startDate: string, endDate: string): Promise<AnalyticsSummary> {
    return this.request<AnalyticsSummary>(
      `/api/analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
  }

  // --- Recipes & USDA ---
  public getRecipes(search?: string, category?: string): Promise<Recipe[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    return this.request<Recipe[]>(`/api/recipes?${params.toString()}`);
  }

  public getRecommendations(): Promise<RecipeRecommendation[]> {
    return this.request<RecipeRecommendation[]>('/api/recipes/recommendations');
  }

  public searchUsda(query: string): Promise<USDAFoodNutrient[]> {
    return this.request<USDAFoodNutrient[]>(
      `/api/usda/search?query=${encodeURIComponent(query)}`
    );
  }

  // --- Native iOS PDF Report URL ---
  public getClinicalPdfDownloadUrl(startDate: string, endDate: string): string {
    return `${this.baseUrl}/api/reports/export.pdf?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}`;
  }
}
