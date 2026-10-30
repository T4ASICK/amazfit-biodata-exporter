export const DESTINATIONS = {
  TELEGRAM: "telegram",
  CUSTOM: "custom",
};

export const SETTINGS_KEYS = {
  enabled: "biodata.enabled",
  destination: "biodata.destination",
  telegramBotToken: "telegram.botToken",
  telegramChatId: "telegram.chatId",
  customEndpointUrl: "custom.endpointUrl",
  intervalMinutes: "biodata.intervalMinutes",
  timeoutSeconds: "biodata.timeoutSeconds",
  sendWhenNotWearing: "biodata.sendWhenNotWearing",
  lastSentAt: "status.lastSentAt",
  lastStatus: "status.lastStatus",
  lastError: "status.lastError",
  lastHttpStatus: "status.lastHttpStatus",
};

export const METRIC_SETTINGS = [
  {
    key: "metrics.heartRateLast",
    field: "heartRateLast",
    label: "Heart rate",
    defaultValue: true,
  },
  {
    key: "metrics.battery",
    field: "battery",
    label: "Battery",
    defaultValue: true,
  },
  {
    key: "metrics.calorie",
    field: "calorie",
    label: "Calories",
    defaultValue: true,
  },
  {
    key: "metrics.bloodOxygen",
    field: "bloodOxygen",
    label: "Blood oxygen",
    defaultValue: true,
  },
  {
    key: "metrics.distance",
    field: "distance",
    label: "Distance",
    defaultValue: true,
  },
  {
    key: "metrics.fatBurning",
    field: "fatBurning",
    label: "Fat burning",
    defaultValue: true,
  },
  {
    key: "metrics.pai",
    field: "pai",
    label: "PAI",
    defaultValue: true,
  },
  {
    key: "metrics.sleepInfo",
    field: "sleepInfo",
    label: "Sleep",
    defaultValue: true,
  },
  {
    key: "metrics.stands",
    field: "stands",
    label: "Stands",
    defaultValue: true,
  },
  {
    key: "metrics.steps",
    field: "steps",
    label: "Steps",
    defaultValue: true,
  },
  {
    key: "metrics.stress",
    field: "stress",
    label: "Stress",
    defaultValue: true,
  },
  {
    key: "metrics.isWearing",
    field: "isWearing",
    label: "Wear status",
    defaultValue: true,
  },
  {
    key: "metrics.deviceInfo",
    field: "device",
    label: "Device info",
    defaultValue: false,
  },
];

export const DEFAULT_EXPORTER_CONFIG = {
  enabled: true,
  destination: DESTINATIONS.TELEGRAM,
  telegramBotToken: "",
  telegramChatId: "",
  customEndpointUrl: "",
  intervalMinutes: 1,
  timeoutSeconds: 5,
  sendWhenNotWearing: true,
};

export function readStorageValue(storage, key) {
  if (!storage || typeof storage.getItem !== "function") {
    return undefined;
  }

  const value = storage.getItem(key);
  return value === null ? undefined : value;
}

export function writeStorageValue(storage, key, value) {
  if (!storage || typeof storage.setItem !== "function") {
    return;
  }

  storage.setItem(key, String(value));
}

export function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value).toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

export function toInteger(value, fallback, min, max) {
  const numberValue = Number.parseInt(value, 10);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  if (typeof min === "number" && numberValue < min) {
    return min;
  }

  if (typeof max === "number" && numberValue > max) {
    return max;
  }

  return numberValue;
}

export function readExporterConfig(storage) {
  const include = {};

  for (const metric of METRIC_SETTINGS) {
    include[metric.field] = toBoolean(
      readStorageValue(storage, metric.key),
      metric.defaultValue,
    );
  }

  return {
    enabled: toBoolean(
      readStorageValue(storage, SETTINGS_KEYS.enabled),
      DEFAULT_EXPORTER_CONFIG.enabled,
    ),
    destination:
      readStorageValue(storage, SETTINGS_KEYS.destination) ||
      DEFAULT_EXPORTER_CONFIG.destination,
    telegramBotToken:
      readStorageValue(storage, SETTINGS_KEYS.telegramBotToken) ||
      DEFAULT_EXPORTER_CONFIG.telegramBotToken,
    telegramChatId:
      readStorageValue(storage, SETTINGS_KEYS.telegramChatId) ||
      DEFAULT_EXPORTER_CONFIG.telegramChatId,
    customEndpointUrl:
      readStorageValue(storage, SETTINGS_KEYS.customEndpointUrl) ||
      DEFAULT_EXPORTER_CONFIG.customEndpointUrl,
    intervalMinutes: toInteger(
      readStorageValue(storage, SETTINGS_KEYS.intervalMinutes),
      DEFAULT_EXPORTER_CONFIG.intervalMinutes,
      1,
      60,
    ),
    timeoutSeconds: toInteger(
      readStorageValue(storage, SETTINGS_KEYS.timeoutSeconds),
      DEFAULT_EXPORTER_CONFIG.timeoutSeconds,
      3,
      60,
    ),
    sendWhenNotWearing: toBoolean(
      readStorageValue(storage, SETTINGS_KEYS.sendWhenNotWearing),
      DEFAULT_EXPORTER_CONFIG.sendWhenNotWearing,
    ),
    include,
  };
}
