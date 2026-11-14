import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-console": "error",
    },
  },
  {
    ignores: ["src/harmonization/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/harmonization/*",
                "!**/harmonization/grid-activity*",
                "!**/harmonization/harmonize-region*",
                "!**/harmonization/fire-calendar*",
                "!**/harmonization/calendar-day*",
              ],
              message:
                "Use gridActivity, harmonizeRegion, the FireCalendar types and calendar-day; the other harmonization files are internal.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
