import { BasePage } from "@zeppos/zml/base-page";
import {
  Battery,
  BloodOxygen,
  Calorie,
  Distance,
  FatBurning,
  HeartRate,
  Pai,
  Sleep,
  Stand,
  Step,
  Stress,
  Wear,
} from "@zos/sensor";
import { getDeviceInfo } from "@zos/device";
import { connectStatus } from "@zos/ble";
import { log } from "@zos/utils";
import * as appService from "@zos/app-service";

const appLogger = log.getLogger("background_service");
let exportRunning = false;

function metricEnabled(config, field) {
  return !config || !config.include || config.include[field] !== false;
}

function readMetric(metrics, field, getter) {
  try {
    metrics[field] = getter();
  } catch (error) {
    appLogger.error(`Failed to read metric ${field}`, error);
  }
}

function collectMetrics(config) {
  appLogger.log("Starting metrics collection");

  const metrics = {
    recordTime: Math.floor(Date.now() / 1000),
  };

  if (metricEnabled(config, "device")) {
    readMetric(metrics, "device", () => getDeviceInfo());
  }

  if (metricEnabled(config, "heartRateLast")) {
    readMetric(metrics, "heartRateLast", () => new HeartRate().getLast());
  }

  if (metricEnabled(config, "battery")) {
    readMetric(metrics, "battery", () => new Battery().getCurrent());
  }

  if (metricEnabled(config, "calorie")) {
    readMetric(metrics, "calorie", () => new Calorie().getCurrent());
  }

  if (metricEnabled(config, "bloodOxygen")) {
    readMetric(metrics, "bloodOxygen", () => new BloodOxygen().getCurrent());
  }

  if (metricEnabled(config, "distance")) {
    readMetric(metrics, "distance", () => new Distance().getCurrent());
  }

  if (metricEnabled(config, "fatBurning")) {
    readMetric(metrics, "fatBurning", () => new FatBurning().getCurrent());
  }

  if (metricEnabled(config, "pai")) {
    readMetric(metrics, "pai", () => {
      const pai = new Pai();
      return {
        total: pai.getTotal(),
        today: pai.getToday(),
      };
    });
  }

  if (metricEnabled(config, "sleepInfo")) {
    readMetric(metrics, "sleepInfo", () => new Sleep().getInfo());
  }

  if (metricEnabled(config, "stands")) {
    readMetric(metrics, "stands", () => new Stand().getCurrent());
  }

  if (metricEnabled(config, "steps")) {
    readMetric(metrics, "steps", () => new Step().getCurrent());
  }

  if (metricEnabled(config, "stress")) {
    readMetric(metrics, "stress", () => new Stress().getCurrent());
  }

  if (metricEnabled(config, "isWearing") || !config.sendWhenNotWearing) {
    readMetric(metrics, "isWearing", () => new Wear().getStatus());
  }

  appLogger.log("Metrics collected", JSON.stringify(metrics));
  return metrics;
}

function exitService() {
  exportRunning = false;
  appService.exit();
}

function runExport(vm) {
  if (exportRunning) {
    appLogger.log("Export already running, skipping duplicate event");
    return;
  }

  exportRunning = true;

  if (!connectStatus()) {
    appLogger.error("No BLE connection, aborting");
    exitService();
    return;
  }

  vm
    .request({
      method: "settings.getRuntimeConfig",
      params: {},
    })
    .then((decision) => {
      if (!decision || !decision.collect) {
        appLogger.log(
          "Metrics collection skipped",
          decision ? decision.reason : "no decision",
        );
        exitService();
        return;
      }

      const metrics = collectMetrics(decision.config);

      vm
        .request({
          method: "metrics.submit",
          params: { metrics },
        })
        .then((result) => {
          appLogger.log("Metrics submit result", JSON.stringify(result));
          exitService();
        })
        .catch((error) => {
          appLogger.error("Metrics submit failed", error);
          exitService();
        });
    })
    .catch((error) => {
      appLogger.error("Runtime config request failed", error);
      exitService();
    });
}

AppService(
  BasePage({
    onEvent(e) {
      appLogger.log(`service onEvent(${e})`);
      runExport(this);
    },

    onInit(e) {
      appLogger.log(`service onInit(${e})`);
      runExport(this);
    },
  }),
);
