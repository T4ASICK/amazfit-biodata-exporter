import {
  DESTINATIONS,
  METRIC_SETTINGS,
  SETTINGS_KEYS,
  readExporterConfig,
  readStorageValue,
  writeStorageValue,
} from "../utils/settings";

const DESTINATION_OPTIONS = [
  { name: "Telegram", value: DESTINATIONS.TELEGRAM },
  { name: "Custom HTTP", value: DESTINATIONS.CUSTOM },
];

const INTERVAL_OPTIONS = [
  { name: "Every minute", value: "1" },
  { name: "Every 5 minutes", value: "5" },
  { name: "Every 10 minutes", value: "10" },
  { name: "Every 15 minutes", value: "15" },
  { name: "Every 30 minutes", value: "30" },
  { name: "Hourly", value: "60" },
];

const TIMEOUT_OPTIONS = [
  { name: "5 seconds", value: "5" },
  { name: "10 seconds", value: "10" },
  { name: "20 seconds", value: "20" },
  { name: "30 seconds", value: "30" },
  { name: "60 seconds", value: "60" },
];

const METRIC_GROUPS = [
  {
    title: "Body",
    fields: ["heartRateLast", "bloodOxygen", "stress", "sleepInfo"],
  },
  {
    title: "Activity",
    fields: ["steps", "distance", "calorie", "fatBurning", "stands", "pai"],
  },
  {
    title: "Device",
    fields: ["battery", "isWearing", "device"],
  },
];

const PAGE_STYLE = {
  padding: "12px",
  background: "#f4f6f8",
};

const HERO_STYLE = {
  padding: "16px",
  marginBottom: "12px",
  borderRadius: "8px",
  background: "#17405f",
  color: "#ffffff",
};

const HERO_TITLE_STYLE = {
  fontSize: "18px",
  color: "#ffffff",
  marginBottom: "4px",
};

const HERO_SUBTITLE_STYLE = {
  fontSize: "12px",
  color: "#d7f4ef",
  marginBottom: "10px",
};

const HERO_READY_STYLE = {
  fontSize: "12px",
  color: "#65e39c",
};

const HERO_ERROR_STYLE = {
  fontSize: "12px",
  color: "#ffb0a8",
};

const MUTED_TEXT_STYLE = {
  fontSize: "12px",
  color: "#666666",
};

const SMALL_TEXT_STYLE = {
  fontSize: "11px",
  color: "#777777",
};

const ERROR_TEXT_STYLE = {
  fontSize: "12px",
  color: "#c13b32",
};

const PANEL_STYLE = {
  padding: "14px",
  marginBottom: "12px",
  borderRadius: "8px",
  background: "#ffffff",
};

const PANEL_TITLE_STYLE = {
  fontSize: "16px",
  color: "#111111",
  marginBottom: "3px",
};

const PANEL_SUBTITLE_STYLE = {
  fontSize: "12px",
  color: "#68737d",
  marginBottom: "10px",
};

const FIELD_STYLE = {
  width: "100%",
  marginTop: "8px",
};

const BUTTON_ROW_STYLE = {
  display: "flex",
  flexDirection: "row",
  gap: "8px",
  marginTop: "8px",
};

const COMPACT_BUTTON_STYLE = {
  flex: 1,
  fontSize: "12px",
  borderRadius: "8px",
};

const SECONDARY_BUTTON_STYLE = {
  ...COMPACT_BUTTON_STYLE,
  background: "#eceff1",
  color: "#222222",
};

function setBoolean(settingsStorage, key, value) {
  writeStorageValue(settingsStorage, key, value ? "true" : "false");
}

function setValue(settingsStorage, key, value) {
  writeStorageValue(settingsStorage, key, value);
}

function panel(title, subtitle, children) {
  const content = [Text({ bold: true, style: PANEL_TITLE_STYLE }, [title])];

  if (subtitle) {
    content.push(
      Text({ paragraph: true, style: PANEL_SUBTITLE_STYLE }, [subtitle]),
    );
  }

  return View({ style: PANEL_STYLE }, content.concat(children || []));
}

function controlField(renderFunc) {
  return View({ style: FIELD_STYLE }, [renderFunc]);
}

function findMetric(fieldName) {
  for (const metric of METRIC_SETTINGS) {
    if (metric.field === fieldName) {
      return metric;
    }
  }

  return null;
}

function getMetricCount(config) {
  let count = 0;

  for (const metric of METRIC_SETTINGS) {
    if (config.include[metric.field]) {
      count += 1;
    }
  }

  return count;
}

function getDestinationState(config) {
  if (config.destination === DESTINATIONS.CUSTOM) {
    return {
      label: "Custom HTTP",
      ready: Boolean(config.customEndpointUrl),
    };
  }

  return {
    label: "Telegram",
    ready: Boolean(config.telegramBotToken && config.telegramChatId),
  };
}

function formatLastSent(value) {
  const seconds = Number.parseInt(value, 10);

  if (!seconds) {
    return "Never";
  }

  return new Date(seconds * 1000).toLocaleString();
}

function clearStatus(settingsStorage) {
  settingsStorage.removeItem(SETTINGS_KEYS.lastSentAt);
  settingsStorage.removeItem(SETTINGS_KEYS.lastError);
  settingsStorage.removeItem(SETTINGS_KEYS.lastHttpStatus);
  setValue(settingsStorage, SETTINGS_KEYS.lastStatus, "Ready");
}

function markSendOnNextRun(settingsStorage) {
  settingsStorage.removeItem(SETTINGS_KEYS.lastSentAt);
  settingsStorage.removeItem(SETTINGS_KEYS.lastError);
  setValue(settingsStorage, SETTINGS_KEYS.lastStatus, "Queued");
}

function applyMetrics(settingsStorage, fields) {
  for (const metric of METRIC_SETTINGS) {
    setBoolean(settingsStorage, metric.key, fields.indexOf(metric.field) !== -1);
  }
}

function applyAllMetrics(settingsStorage, enabled) {
  for (const metric of METRIC_SETTINGS) {
    setBoolean(settingsStorage, metric.key, enabled);
  }
}

function metricToggle(settingsStorage, config, fieldName) {
  const metric = findMetric(fieldName);

  if (!metric) {
    return controlField(
      Text({ paragraph: true, style: ERROR_TEXT_STYLE }, [
        `Unknown metric: ${fieldName}`,
      ]),
    );
  }

  return controlField(
    Toggle({
      label: metric.label,
      value: config.include[metric.field],
      onChange: (value) => setBoolean(settingsStorage, metric.key, value),
    }),
  );
}

function metricGroup(settingsStorage, config, group) {
  return panel(
    group.title,
    null,
    group.fields.map((fieldName) =>
      metricToggle(settingsStorage, config, fieldName),
    ),
  );
}

function destinationFields(settingsStorage, config) {
  if (config.destination === DESTINATIONS.CUSTOM) {
    return [
      controlField(
        TextInput({
          label: "Endpoint URL",
          value: config.customEndpointUrl,
          placeholder: "https://example.com/metrics",
          onChange: (value) =>
            setValue(
              settingsStorage,
              SETTINGS_KEYS.customEndpointUrl,
              value.trim(),
            ),
        }),
      ),
      Text({ paragraph: true, style: SMALL_TEXT_STYLE }, [
        "Payload is sent as JSON by POST.",
      ]),
    ];
  }

  return [
    controlField(
      TextInput({
        label: "Bot token",
        value: config.telegramBotToken,
        placeholder: "123456:ABC",
        onChange: (value) =>
          setValue(settingsStorage, SETTINGS_KEYS.telegramBotToken, value.trim()),
      }),
    ),
    controlField(
      TextInput({
        label: "Chat ID",
        value: config.telegramChatId,
        placeholder: "123456789",
        onChange: (value) =>
          setValue(settingsStorage, SETTINGS_KEYS.telegramChatId, value.trim()),
      }),
    ),
  ];
}

function hero(config, status) {
  const destination = getDestinationState(config);
  const metricCount = getMetricCount(config);
  const stateText = config.enabled ? "Running" : "Paused";
  const readinessText = destination.ready ? "Configured" : "Needs setup";
  const readinessStyle = destination.ready ? HERO_READY_STYLE : HERO_ERROR_STYLE;

  return View({ style: HERO_STYLE }, [
    Text({ bold: true, style: HERO_TITLE_STYLE }, ["Biodata Exporter"]),
    Text({ paragraph: true, style: HERO_SUBTITLE_STYLE }, [
      `${stateText} - ${destination.label} - ${metricCount} metrics`,
    ]),
    Text({ paragraph: true, style: readinessStyle }, [readinessText]),
    Text({ paragraph: true, style: HERO_SUBTITLE_STYLE }, [
      `Last: ${status.lastSent}`,
    ]),
  ]);
}

function exportSection(settingsStorage, config) {
  return panel("Export", config.enabled ? "Active" : "Paused", [
    controlField(
      Toggle({
        label: "Enabled",
        value: config.enabled,
        onChange: (value) =>
          setBoolean(settingsStorage, SETTINGS_KEYS.enabled, value),
      }),
    ),
    controlField(
      Toggle({
        label: "Send when not worn",
        value: config.sendWhenNotWearing,
        onChange: (value) =>
          setBoolean(settingsStorage, SETTINGS_KEYS.sendWhenNotWearing, value),
      }),
    ),
  ]);
}

function scheduleSection(settingsStorage, config) {
  return panel("Schedule", `${config.intervalMinutes} min interval`, [
    controlField(
      Select({
        label: "Export interval",
        options: INTERVAL_OPTIONS,
        value: String(config.intervalMinutes),
        onChange: (value) =>
          setValue(settingsStorage, SETTINGS_KEYS.intervalMinutes, value),
      }),
    ),
    controlField(
      Select({
        label: "HTTP timeout",
        options: TIMEOUT_OPTIONS,
        value: String(config.timeoutSeconds),
        onChange: (value) =>
          setValue(settingsStorage, SETTINGS_KEYS.timeoutSeconds, value),
      }),
    ),
  ]);
}

function destinationSection(settingsStorage, config) {
  const destination = getDestinationState(config);

  return panel(
    "Destination",
    destination.ready ? "Ready" : "Missing fields",
    [
      controlField(
        Select({
          label: "Send to",
          options: DESTINATION_OPTIONS,
          value: config.destination,
          onChange: (value) =>
            setValue(settingsStorage, SETTINGS_KEYS.destination, value),
        }),
      ),
      ...destinationFields(settingsStorage, config),
    ],
  );
}

function metricsActions(settingsStorage) {
  return panel("Metric presets", "Quickly choose common metric sets", [
    View({ style: BUTTON_ROW_STYLE }, [
      Button({
        label: "Health",
        color: "primary",
        style: COMPACT_BUTTON_STYLE,
        onClick: () =>
          applyMetrics(settingsStorage, [
            "heartRateLast",
            "bloodOxygen",
            "stress",
            "sleepInfo",
            "isWearing",
            "battery",
          ]),
      }),
      Button({
        label: "Activity",
        color: "primary",
        style: COMPACT_BUTTON_STYLE,
        onClick: () =>
          applyMetrics(settingsStorage, [
            "steps",
            "distance",
            "calorie",
            "fatBurning",
            "stands",
            "pai",
            "battery",
          ]),
      }),
    ]),
    View({ style: BUTTON_ROW_STYLE }, [
      Button({
        label: "All",
        color: "secondary",
        style: SECONDARY_BUTTON_STYLE,
        onClick: () => applyAllMetrics(settingsStorage, true),
      }),
      Button({
        label: "None",
        color: "secondary",
        style: SECONDARY_BUTTON_STYLE,
        onClick: () => applyAllMetrics(settingsStorage, false),
      }),
    ]),
  ]);
}

function statusSection(settingsStorage, status) {
  const statusStyle = status.lastError ? ERROR_TEXT_STYLE : MUTED_TEXT_STYLE;

  return panel("Status", status.lastStatus, [
    Text({ paragraph: true, style: MUTED_TEXT_STYLE }, [
      `Last sent: ${status.lastSent}`,
    ]),
    Text({ paragraph: true, style: MUTED_TEXT_STYLE }, [
      status.lastHttpStatus ? `HTTP: ${status.lastHttpStatus}` : "HTTP: -",
    ]),
    Text({ paragraph: true, style: statusStyle }, [
      status.lastError ? `Error: ${status.lastError}` : "No errors",
    ]),
    View({ style: BUTTON_ROW_STYLE }, [
      Button({
        label: "Next run",
        color: "primary",
        style: COMPACT_BUTTON_STYLE,
        onClick: () => markSendOnNextRun(settingsStorage),
      }),
      Button({
        label: "Clear",
        color: "secondary",
        style: SECONDARY_BUTTON_STYLE,
        onClick: () => clearStatus(settingsStorage),
      }),
    ]),
  ]);
}

AppSettingsPage({
  build(props) {
    const { settingsStorage } = props;
    const config = readExporterConfig(settingsStorage);
    const status = {
      lastSent: formatLastSent(
        readStorageValue(settingsStorage, SETTINGS_KEYS.lastSentAt),
      ),
      lastStatus:
        readStorageValue(settingsStorage, SETTINGS_KEYS.lastStatus) || "Never",
      lastError:
        readStorageValue(settingsStorage, SETTINGS_KEYS.lastError) || "",
      lastHttpStatus:
        readStorageValue(settingsStorage, SETTINGS_KEYS.lastHttpStatus) || "",
    };
    const children = [
      hero(config, status),
      exportSection(settingsStorage, config),
      scheduleSection(settingsStorage, config),
      destinationSection(settingsStorage, config),
      metricsActions(settingsStorage),
    ];

    for (const group of METRIC_GROUPS) {
      children.push(metricGroup(settingsStorage, config, group));
    }

    children.push(statusSection(settingsStorage, status));

    return View({ style: PAGE_STYLE }, children);
  },
});
