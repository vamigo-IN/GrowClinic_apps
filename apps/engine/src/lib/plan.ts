import type { Plan } from '@prisma/client';

// Feature limits per plan. One source of truth — checked by API + admin UI.
export interface PlanLimits {
  connectedSites: number; // Infinity = unlimited
  leadsPerMonth: number;
  alerts: boolean; // WhatsApp / email lead alerts
  followUps: boolean; // pipeline stages + follow-ups
  teamMembers: number;
  apiExport: boolean;
  brandingRemovable: boolean; // remove "Powered by GrowClinic"
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    connectedSites: 1,
    leadsPerMonth: 50,
    alerts: false,
    followUps: false,
    teamMembers: 1,
    apiExport: false,
    brandingRemovable: false,
  },
  PRO: {
    connectedSites: Infinity,
    leadsPerMonth: Infinity,
    alerts: true,
    followUps: true,
    teamMembers: Infinity,
    apiExport: true,
    brandingRemovable: true,
  },
};

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}
