// /lib/store/wizard.ts
// Wizard state — single source of truth for the multi-step input flow.
// Persisted to localStorage so a refresh restores the in-progress draft.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlantInput } from "../types/PlantInput";

export type WizardStep = 1 | 2 | 3 | 4 | 5;
export type UserType = "new" | "operator" | "multi";

export interface WizardData {
  currentStep: WizardStep;
  userType: UserType | null;
  /** Plant drafts — only the active index is being edited at a time. */
  plants: Array<Partial<PlantInput>>;
  activePlantIndex: number;
  /** Set when the user reaches the result page (or loads a demo). */
  isComplete: boolean;
  // Financial defaults (PR=0.85 per domain decision; see assumptions.md).
  performanceRatio: number;
  discountRate: number;
  /** Equity ratio for IRR computation (default 0.30). */
  equityRatio: number;
  capex?: number;
}

export interface WizardActions {
  setStep: (s: WizardStep) => void;
  setUserType: (t: UserType) => void;
  updatePlant: (patch: Partial<PlantInput>) => void;
  setActivePlant: (i: number) => void;
  addPlant: () => void;
  removePlant: (i: number) => void;
  setPerformanceRatio: (pr: number) => void;
  setDiscountRate: (r: number) => void;
  setEquityRatio: (r: number) => void;
  setCapex: (c?: number) => void;
  markComplete: () => void;
  reset: () => void;
  /** Replace the wizard plants with a complete list (e.g. demo preset). */
  loadFromPlants: (plants: PlantInput[]) => void;
}

const initialData: WizardData = {
  currentStep: 1,
  userType: null,
  plants: [{}],
  activePlantIndex: 0,
  isComplete: false,
  performanceRatio: 0.85,
  discountRate: 0.05,
  equityRatio: 0.3,
};

export const useWizardStore = create<WizardData & WizardActions>()(
  persist(
    (set) => ({
      ...initialData,
      setStep: (s) => set({ currentStep: s }),
      setUserType: (t) => set({ userType: t }),
      updatePlant: (patch) =>
        set((state) => {
          const plants = state.plants.slice();
          const current = plants[state.activePlantIndex] ?? {};
          plants[state.activePlantIndex] = { ...current, ...patch };
          return { plants };
        }),
      setActivePlant: (i) => set({ activePlantIndex: i }),
      addPlant: () =>
        set((state) => ({
          plants: [...state.plants, {}],
          activePlantIndex: state.plants.length,
        })),
      removePlant: (i) =>
        set((state) => {
          const filtered = state.plants.filter((_, idx) => idx !== i);
          const plants = filtered.length > 0 ? filtered : [{}];
          const nextIndex = Math.max(
            0,
            Math.min(state.activePlantIndex, plants.length - 1),
          );
          return { plants, activePlantIndex: nextIndex };
        }),
      setPerformanceRatio: (pr) => set({ performanceRatio: pr }),
      setDiscountRate: (r) => set({ discountRate: r }),
      setEquityRatio: (r) => set({ equityRatio: r }),
      setCapex: (c) => set({ capex: c }),
      markComplete: () => set({ isComplete: true }),
      reset: () => set({ ...initialData }),
      loadFromPlants: (plants) =>
        set({
          plants,
          activePlantIndex: 0,
          userType: plants.length > 1 ? "multi" : "operator",
          currentStep: 1,
          isComplete: true,
        }),
    }),
    { name: "sdh-wizard-v1" },
  ),
);
