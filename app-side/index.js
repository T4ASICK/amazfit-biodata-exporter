import { BaseSideService } from "@zeppos/zml/base-side";
import {
  DESTINATIONS,
  METRIC_SETTINGS,
  SETTINGS_KEYS,
  readExporterConfig,
  readStorageValue,
  writeStorageValue,
} from "../utils/settings";

const APP_NAME = "Biodata Exporter";
const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function getLastSentAt(settings) {
  const value = Number.parseInt(
    readStorageValue(settings, SETTINGS_KEYS.lastSentAt),
    10,
  );

  return Number.isNaN(value) ? 0 : value;
}

function getDestinationError(config) {
  if (config.destination === DESTINATIONS.TELEGRAM) {
    if (!config.telegramBotToken || !config.telegramChatId) {
      return "Telegram token or chat id is empty";
    }

    return "";
  }

  if (config.destination === DESTINATIONS.CUSTOM) {
    return config.customEndpointUrl ? "" : "Endpoint URL is empty";
  }

  return `Unsupported destination: ${config.destination}`;
}

function getRuntimeDecision(settings) {
  const config = readExporterConfig(settings);
  const currentTime = nowSeconds();

  if (!config.enabled) {
    return { collect: false, reason: "disabled", config };
  }

  const destinationError = getDestinationError(config);
  if (destinationError) {
    return { collect: false, reason: destinationError, config };
  }

  const lastSentAt = getLastSentAt(settings);
  const intervalSeconds = config.intervalMinutes * 60;
  const elapsedSeconds = currentTime - lastSentAt;

  if (lastSentAt && elapsedSeconds < intervalSeconds) {
    return {
      collect: false,
      reason: "interval",
      nextInSeconds: intervalSeconds - elapsedSeconds,
      config,
    };
  }

  return { collect: true, reason: "ready", config };
}

function filterMetrics(metrics, config) {
  const filtered = {
    recordTime: metrics.recordTime,
  };

  for (const metric of METRIC_SETTINGS) {
    if (config.include[metric.field] && metrics[metric.field] !== undefined) {
      filtered[metric.field] = metrics[metric.field];
    }
  }

  return filtered;
}

function formatTelegramMessage(metrics) {
  return `${APP_NAME}\n\n${JSON.stringify(metrics, null, 2)}`;
}

function buildRequest(config, metrics) {
  if (config.destination === DESTINATIONS.CUSTOM) {
    return {
      url: config.customEndpointUrl,
      body: {
        app: APP_NAME,
        metrics,
      },
    };
  }

  return {
    url: `${TELEGRAM_API_BASE_URL}/bot${config.telegramBotToken}/sendMessage`,
    body: {
      chat_id: config.telegramChatId,
      text: formatTelegramMessage(metrics),
    },
  };
}

function statusFromResponse(response) {
  if (!response) {
    return "";
  }

  if (response.status !== undefined) {
    return String(response.status);
  }

  return "";
}

function errorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || JSON.stringify(error);
}

function updateStatus(settings, status, httpStatus, error) {
  writeStorageValue(settings, SETTINGS_KEYS.lastStatus, status);
  writeStorageValue(settings, SETTINGS_KEYS.lastHttpStatus, httpStatus || "");

  if (error) {
    writeStorageValue(settings, SETTINGS_KEYS.lastError, error);
  } else {
    settings.removeItem(SETTINGS_KEYS.lastError);
  }
}

AppSideService(
  BaseSideService({
    onInit() {
      this.log("app side service invoke onInit");
    },

    onRun() {
      this.log("app side service invoke onRun");
    },

    onDestroy() {
      this.log("app side service invoke onDestroy");
    },

    onSettingsChange({ key, newValue, oldValue }) {
      this.log("settings changed", key, newValue, oldValue);
    },

    async onRequest(req, res) {
      try {
        switch (req.method) {
          case "settings.getRuntimeConfig": {
            res(null, getRuntimeDecision(this.settings));
            break;
          }

          case "metrics.submit": {
            const result = await this.submitMetrics(req.params.metrics);
            res(null, result);
            break;
          }

          default: {
            res({
              status: "error",
              message: `Unknown method: ${req.method}`,
            });
          }
        }
      } catch (error) {
        const message = errorMessage(error);
        updateStatus(this.settings, "Error", "", message);
        this.error("request failed", message);
        res({ status: "error", message });
      }
    },

    async submitMetrics(metrics) {
      const decision = getRuntimeDecision(this.settings);

      if (!decision.collect) {
        updateStatus(this.settings, `Skipped: ${decision.reason}`, "", "");
        return {
          status: "skipped",
          reason: decision.reason,
          nextInSeconds: decision.nextInSeconds || 0,
        };
      }

      const config = decision.config;

      if (!config.sendWhenNotWearing && metrics.isWearing === false) {
        updateStatus(this.settings, "Skipped: not worn", "", "");
        return { status: "skipped", reason: "not_worn" };
      }

      const filteredMetrics = filterMetrics(metrics, config);
      const request = buildRequest(config, filteredMetrics);

      const response = await this.fetch({
        method: "POST",
        url: request.url,
        body: JSON.stringify(request.body),
        headers: { "Content-Type": "application/json" },
        timeout: config.timeoutSeconds * 1000,
      });

      const httpStatus = statusFromResponse(response);

      if (response && response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
      }

      writeStorageValue(this.settings, SETTINGS_KEYS.lastSentAt, nowSeconds());
      updateStatus(this.settings, "Sent", httpStatus, "");

      return {
        status: "sent",
        httpStatus,
      };
    },
  }),
);
