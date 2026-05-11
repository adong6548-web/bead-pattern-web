import { getPatternPlanPreset } from "@/config/patternPresets";
import type { PatternPlan } from "@/types/pattern";

function createPlan(id: string, width: number, height: number, isRecommended: boolean): PatternPlan {
  const preset = getPatternPlanPreset(id);

  return {
    id,
    name: preset?.name ?? id,
    width,
    height,
    isRecommended,
  };
}

export function recommendPatternPlans(aspectRatio: number): PatternPlan[] {
  if (aspectRatio > 1.5) {
    return [
      createPlan("novice-square", 40, 40, false),
      createPlan("recommended-wide", 80, 40, true),
      createPlan("fine-wide", 96, 48, false),
    ];
  }

  if (aspectRatio < 0.67) {
    return [
      createPlan("novice-square", 40, 40, false),
      createPlan("recommended-tall", 40, 80, true),
      createPlan("fine-tall", 48, 96, false),
    ];
  }

  return [
    createPlan("novice-square", 40, 40, false),
    createPlan("recommended-square", 60, 60, true),
    createPlan("fine-square", 80, 80, false),
  ];
}
