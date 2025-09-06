const path = require("node:path");
const fs = require("node:fs");

exports.parse = function (_source, options) {
  fs.writeFileSync(
    path.resolve(__dirname, "parser-was-called.txt"),
    options["foo"],
    "utf-8",
  );
  return {
    type: "Program",
    start: 0,
    end: 0,
    loc: {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 0 },
    },
    range: [0, 0],
    body: [],
    sourceType: "module",
    comments: [],
    tokens: [],
  };
};
