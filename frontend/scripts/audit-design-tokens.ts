import { promises as fs } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const FORBIDDEN_REGEXES = [
  { pattern: /\bp[xytrbl]?-(1|3|5|7|9|10|11|13|14|15|17|18|19|20)\b/g, msg: "Off-scale spacing" },
  { pattern: /\b(text|bg|border)-neutral-\d+\b/g, msg: "Hard-coded neutral color (use token)" },
  { pattern: /\b(text|bg)-(white|black)\b/g, msg: "Hard-coded black/white (use token)" },
];

const ALLOWLIST = [
  "globals.css",
  "audit-design-tokens.ts",
];

async function *walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        yield* walk(res);
      }
    } else {
      if (res.endsWith(".tsx") || res.endsWith(".ts")) {
        yield res;
      }
    }
  }
}

async function run() {
  const { values } = parseArgs({
    options: { strict: { type: "boolean", default: false } },
    strict: false,
  });

  let totalViolations = 0;

  for await (const file of walk(".")) {
    if (ALLOWLIST.some((a) => file.includes(a))) continue;

    const content = await fs.readFile(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, i) => {
      for (const rule of FORBIDDEN_REGEXES) {
        let match;
        while ((match = rule.pattern.exec(line)) !== null) {
          console.warn(`[${rule.msg}] ${file}:${i + 1} -> ${match[0]}`);
          totalViolations++;
        }
      }
    });
  }

  if (totalViolations > 0) {
    console.warn(`\nFound ${totalViolations} design token violations.`);
    if (values.strict) {
      console.error("Exiting with failure due to --strict mode.");
      process.exit(1);
    }
  } else {
    console.log("No design token violations found.");
  }
}

run().catch(console.error);
