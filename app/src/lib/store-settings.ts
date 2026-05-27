export type StoreSettings = {
  deliveryEstimateDays: number;
  originCity: string;
  originCountry: string;
  paymentWindowHours: number;
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  deliveryEstimateDays: 2,
  originCity: "Kathmandu",
  originCountry: "Nepal",
  paymentWindowHours: 24,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getBoundedInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(parsed), min), max);
};

const getString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
};

export const getStoreSettings = (config: unknown): StoreSettings => {
  if (!isRecord(config)) {
    return DEFAULT_STORE_SETTINGS;
  }

  const settings = isRecord(config.storeSettings) ? config.storeSettings : {};

  return {
    deliveryEstimateDays: getBoundedInteger(
      settings.deliveryEstimateDays,
      DEFAULT_STORE_SETTINGS.deliveryEstimateDays,
      0,
      365,
    ),
    originCity: getString(settings.originCity, DEFAULT_STORE_SETTINGS.originCity),
    originCountry: getString(
      settings.originCountry,
      DEFAULT_STORE_SETTINGS.originCountry,
    ),
    paymentWindowHours: getBoundedInteger(
      settings.paymentWindowHours,
      DEFAULT_STORE_SETTINGS.paymentWindowHours,
      1,
      168,
    ),
  };
};

export const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};
