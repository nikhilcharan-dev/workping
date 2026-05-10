import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "no-return-await": "error",
    },
  },
  {
    files: ["**/*.test.js", "**/test/**/*.js"],
    languageOptions: { globals: { ...globals.jest } },
  },
  { ignores: ["node_modules/", "coverage/"] },
];
