export const HEALTH_QUEUE = 'health';

export const JobName = {
  /** Fächert nächtlich pro aktivem Nutzer Wartungsjobs auf. */
  nightlyFanout: 'nightly-fanout',
  /** Baselines + Score + Insights + Rule-Evaluation für einen Nutzer. */
  userMaintenance: 'user-maintenance',
} as const;

export type JobNameValue = (typeof JobName)[keyof typeof JobName];
