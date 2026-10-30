import hmUI from "@zos/ui";
import * as alarmMgr from "@zos/alarm";
import { BasePage } from "@zeppos/zml/base-page";
import { queryPermission, requestPermission } from "@zos/app";
import {
  FETCH_BUTTON,
  FETCH_RESULT_TEXT,
  STOP_BUTTON,
} from "zosLoader:./index.[pf].layout.js";

const permissions = ["device:os.bg_service", "device:os.alarm"];
const serviceFile = "app-service/background_service";

let textWidget;

function setStatus(text) {
  if (textWidget) {
    textWidget.setProperty(hmUI.prop.MORE, { text });
  }
}

function hasAllPermissions(results) {
  return results.every((result) => result === 2);
}

function permissionRequest(onGranted) {
  const results = queryPermission({ permissions });

  if (hasAllPermissions(results)) {
    onGranted();
    return;
  }

  requestPermission({
    permissions,
    callback(permissionResults) {
      if (hasAllPermissions(permissionResults)) {
        onGranted();
      } else {
        setStatus("Permission denied");
        hmUI.showToast({ text: "Permission denied" });
      }
    },
  });
}

function cancelExistingAlarms() {
  const alarms = alarmMgr.getAllAlarms();

  for (const alarmId of alarms) {
    alarmMgr.cancel(alarmId);
  }
}

function startExportAlarm() {
  cancelExistingAlarms();

  const alarmId = alarmMgr.set({
    url: serviceFile,
    repeat_type: alarmMgr.REPEAT_MINUTE,
    repeat_period: 1,
    repeat_duration: 1,
    store: true,
    delay: 15,
  });

  if (alarmId) {
    setStatus("Export scheduled");
    hmUI.showToast({ text: "Export scheduled" });
  } else {
    setStatus("Schedule failed");
    hmUI.showToast({ text: "Schedule failed" });
  }
}

function stopExportAlarm() {
  cancelExistingAlarms();
  setStatus("Export stopped");
  hmUI.showToast({ text: "Export stopped" });
}

Page(
  BasePage({
    state: {},

    build() {
      textWidget = hmUI.createWidget(hmUI.widget.TEXT, {
        ...FETCH_RESULT_TEXT,
        text: "Configure in Zepp App",
      });

      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...FETCH_BUTTON,
        click_func: () => {
          console.log("=== User clicked start ===");
          permissionRequest(startExportAlarm);
        },
      });

      hmUI.createWidget(hmUI.widget.BUTTON, {
        ...STOP_BUTTON,
        click_func: () => {
          console.log("=== User clicked stop ===");
          permissionRequest(stopExportAlarm);
        },
      });
    },
  }),
);
