"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseHexColor(input) {
  // color is in hex format, like 002200 or 3344ff
  var m = input.match(/^([0-9a-f]{6})$/i);
  if (m) {
    return [
      parseInt(m[1].substr(0, 2), 16),
      parseInt(m[1].substr(2, 2), 16),
      parseInt(m[1].substr(4, 2), 16),
    ];
  } else {
    return null;
  }
}
var esc = "\u001b";
var ansiColor = {
  startColor: function (hexColor) {
    var color = parseHexColor(hexColor);
    if (!color) return "";
    var brightness =
      color.reduce(function (a, b) {
        return a + b;
      }) / 3;
    var foreground;
    if (brightness > 175) {
      // black
      foreground = "".concat(esc, "[38;2;0;0;0m");
    } else {
      // white
      foreground = "".concat(esc, "[38;2;255;255;255m");
    }
    var background = ""
      .concat(esc, "[48;2;")
      .concat(color[0], ";")
      .concat(color[1], ";")
      .concat(color[2], "m");
    return background + foreground;
  },
  endColor: function () {
    return "".concat(esc, "[0m");
  },
};
exports.default = ansiColor;
