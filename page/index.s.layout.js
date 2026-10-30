import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

import {
  DEFAULT_COLOR,
  DEFAULT_COLOR_TRANSPARENT,
} from "../utils/config/constants";
import { DEVICE_WIDTH } from "../utils/config/device";

export const FETCH_BUTTON = {
  x: (DEVICE_WIDTH - px(340)) / 2,
  y: px(240),
  w: px(340),
  h: px(80),
  text_size: px(34),
  radius: px(12),
  normal_color: DEFAULT_COLOR,
  press_color: DEFAULT_COLOR_TRANSPARENT,
  text: "Start export",
};

export const STOP_BUTTON = {
  x: (DEVICE_WIDTH - px(340)) / 2,
  y: px(340),
  w: px(340),
  h: px(80),
  text_size: px(34),
  radius: px(12),
  normal_color: 0x555555,
  press_color: 0x777777,
  text: "Stop export",
};

export const FETCH_RESULT_TEXT = {
  x: px(50),
  y: px(90),
  w: DEVICE_WIDTH - 2 * px(50),
  h: px(130),
  color: 0xffffff,
  text_size: px(26),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.WRAP,
};
