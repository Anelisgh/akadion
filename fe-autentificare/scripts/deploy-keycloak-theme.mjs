import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const themeName = "university-theme";
const sourceDir = path.resolve("keycloak-theme", themeName);
const sourceThemeProperties = path.join(sourceDir, "login", "theme.properties");
const targetRoot = process.argv[2] || process.env.KEYCLOAK_THEMES_DIR;

if (!targetRoot) {
  console.error(
    "Provide the Keycloak themes directory as the first argument or set KEYCLOAK_THEMES_DIR.",
  );
  process.exit(1);
}

const targetDir = path.resolve(targetRoot, themeName);
const targetThemeProperties = path.join(targetDir, "login", "theme.properties");

await access(sourceThemeProperties);

await mkdir(targetRoot, { recursive: true });
await rm(targetDir, { recursive: true, force: true });
await cp(sourceDir, targetDir, { recursive: true });
await access(targetThemeProperties);

console.log(`Theme copied to ${targetDir}`);
console.log(`Verified theme entry file: ${targetThemeProperties}`);
