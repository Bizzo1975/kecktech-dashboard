import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "tile-overrides.json");

export interface TileOverride {
  displayName?: string;
  description?: string;
  icon?: string;
  hidden?: boolean;
}

export type TileOverrides = Record<string, TileOverride>;

export function readOverrides(): TileOverrides {
  try {
    if (!fs.existsSync(FILE)) return {};
    const raw = fs.readFileSync(FILE, "utf-8");
    return JSON.parse(raw) as TileOverrides;
  } catch {
    return {};
  }
}

export function writeOverrides(overrides: TileOverrides): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(FILE, JSON.stringify(overrides, null, 2), "utf-8");
}
