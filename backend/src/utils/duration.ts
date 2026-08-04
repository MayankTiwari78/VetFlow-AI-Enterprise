const UNITS_IN_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
} as const;

type DurationUnit = keyof typeof UNITS_IN_MS;

export const parseDurationMs = (value: string): number => {
  const normalized = value.trim().toLowerCase();
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(normalized);

  if (!match) {
    throw new Error(`Invalid duration value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as DurationUnit;

  return amount * UNITS_IN_MS[unit];
};

export const addDuration = (from: Date, duration: string): Date =>
  new Date(from.getTime() + parseDurationMs(duration));
