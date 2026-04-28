import type { LockedPricingSnapshot } from './pricingSnapshot';

export type RealityEstimationConfig = {
  privateCostPerManHour: number;
  prevailingCostPerManHour: number;
  workDayHours: number;
  desiredProjectDays: number;
};

export type RealityEstimation = {
  baseCleaningCost: number;
  addOnCosts: number;
  totalLaborEquivalentCost: number;
  costPerManHour: number;
  workDayHours: number;
  desiredProjectDays: number;
  totalLaborHours: number;
  totalWorkerDays: number;
  workersNeeded: number;
};

export const DEFAULT_REALITY_ESTIMATION_CONFIG: RealityEstimationConfig = {
  privateCostPerManHour: 39.5,
  prevailingCostPerManHour: 85,
  workDayHours: 9,
  desiredProjectDays: 1,
};

const positiveOrFallback = (value: number, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

export function calculateRealityEstimation(
  snapshot: LockedPricingSnapshot,
  config: RealityEstimationConfig,
): RealityEstimation {
  const baseCleaningCost = Math.max(0, Number(snapshot.base.crewCost) || 0);
  const addOnCosts = Math.max(0, Number(snapshot.services.additionalCosts) || 0);
  const totalLaborEquivalentCost = baseCleaningCost + addOnCosts;
  const costPerManHour = positiveOrFallback(
    snapshot.wageType === 'private'
      ? config.privateCostPerManHour
      : config.prevailingCostPerManHour,
    snapshot.wageType === 'private'
      ? DEFAULT_REALITY_ESTIMATION_CONFIG.privateCostPerManHour
      : DEFAULT_REALITY_ESTIMATION_CONFIG.prevailingCostPerManHour,
  );
  const workDayHours = positiveOrFallback(config.workDayHours, DEFAULT_REALITY_ESTIMATION_CONFIG.workDayHours);
  const desiredProjectDays = positiveOrFallback(
    config.desiredProjectDays,
    DEFAULT_REALITY_ESTIMATION_CONFIG.desiredProjectDays,
  );
  const totalLaborHours = totalLaborEquivalentCost / costPerManHour;
  const totalWorkerDays = totalLaborHours / workDayHours;
  const workersNeeded = Math.max(1, Math.ceil(totalWorkerDays / desiredProjectDays));

  return {
    baseCleaningCost,
    addOnCosts,
    totalLaborEquivalentCost,
    costPerManHour,
    workDayHours,
    desiredProjectDays,
    totalLaborHours,
    totalWorkerDays,
    workersNeeded,
  };
}

export function formatRealityNumber(value: number, digits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
  }).format(value);
}
