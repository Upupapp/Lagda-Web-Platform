#!/usr/bin/env node
// Fails fast when package.json's declared dependency ranges drift from
// either lockfile's recorded specifier. This project keeps two lockfiles —
// pnpm-lock.yaml (local dev) and package-lock.json (CI's `npm ci`, and what
// Netlify's auto-detected pnpm install ALSO frozen-lockfile-checks against)
// — and nothing else keeps them in sync. `pnpm add`/`pnpm install` only
// touches pnpm-lock.yaml; `npm install` only touches package-lock.json. Two
// separate production incidents (a CI-only lint failure from mismatched
// rule versions, then a Netlify deploy-preview outright refusing to install)
// both traced back to exactly this drift going unnoticed until it broke a
// build. See Lagda-Web-Platform#11.
//
// Deliberately dependency-free: a hand-rolled line scanner over the one
// section of pnpm-lock.yaml this needs (importers['.'].{dependencies,
// devDependencies}) rather than pulling in a YAML library for one check.

import { readFileSync } from "node:fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Extracts { name: specifier } from importers['.'].dependencies/devDependencies. */
function parsePnpmRootSpecifiers(yamlText) {
  const lines = yamlText.split("\n");
  const specifiers = {};

  let inRootImporter = false;
  let inDepsSection = false;
  let currentName = null;

  for (const line of lines) {
    if (/^\s*$/.test(line)) continue;

    // Enter/leave the root importer ("  .:").
    if (/^ {2}\S/.test(line)) {
      inRootImporter = /^ {2}\.:\s*$/.test(line);
      inDepsSection = false;
      currentName = null;
      continue;
    }
    if (!inRootImporter) continue;

    // "    dependencies:" / "    devDependencies:" (4-space indent).
    const sectionMatch = /^ {4}(dependencies|devDependencies):\s*$/.exec(line);
    if (sectionMatch) {
      inDepsSection = true;
      currentName = null;
      continue;
    }
    if (!inDepsSection) continue;
    // Any other 4-space-indent key (e.g. the next section) ends this block.
    if (/^ {4}\S/.test(line)) {
      inDepsSection = false;
      currentName = null;
      continue;
    }

    // "      '@scope/name':" or "      name:" (6-space indent).
    const nameMatch = /^ {6}(['"]?)(.+)\1:\s*$/.exec(line);
    if (nameMatch) {
      currentName = nameMatch[2];
      continue;
    }

    // "        specifier: value" (8-space indent).
    const specifierMatch = /^ {8}specifier:\s*(.+)\s*$/.exec(line);
    if (specifierMatch && currentName !== null) {
      specifiers[currentName] = specifierMatch[1].trim();
      currentName = null;
    }
  }

  return specifiers;
}

const pkg = readJson("package.json");
const declared = { ...pkg.dependencies, ...pkg.devDependencies };

const npmLock = readJson("package-lock.json");
const npmRoot = npmLock.packages?.[""] ?? {};
const npmDeclared = { ...npmRoot.dependencies, ...npmRoot.devDependencies };

const pnpmDeclared = parsePnpmRootSpecifiers(readFileSync("pnpm-lock.yaml", "utf8"));

const mismatches = [];
for (const [name, range] of Object.entries(declared)) {
  const npmRange = npmDeclared[name];
  const pnpmRange = pnpmDeclared[name];
  if (npmRange !== undefined && npmRange !== range) {
    mismatches.push(`  ${name}: package.json has "${range}", package-lock.json has "${npmRange}"`);
  }
  if (pnpmRange !== undefined && pnpmRange !== range) {
    mismatches.push(`  ${name}: package.json has "${range}", pnpm-lock.yaml has "${pnpmRange}"`);
  }
}

if (mismatches.length > 0) {
  console.error("Lockfile specifier drift detected:\n");
  console.error(mismatches.join("\n"));
  console.error(
    "\nRun `npm install` AND `pnpm install` after any dependency change — " +
    "each only updates its own lockfile.",
  );
  process.exit(1);
}

console.log("package-lock.json and pnpm-lock.yaml both match package.json's declared ranges.");
