import { FONT_MAPPING } from "./styles-config.js";

const loadedFamilies = new Set();
const loadingPromises = new Map();

async function loadLocalFamily(family, fileName) {
  const url = `./assets/fonts/${fileName}`;
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`font fetch failed: ${url}`);
  const buffer = await res.arrayBuffer();

  const face = new FontFace(family, buffer);
  await face.load();
  document.fonts.add(face);
  await document.fonts.load(`16px "${family}"`);
  loadedFamilies.add(family);
}

function ensureOneFamily(family) {
  if (loadedFamilies.has(family)) return Promise.resolve();
  if (loadingPromises.has(family)) return loadingPromises.get(family);

  const fileName = FONT_MAPPING[family];
  if (!fileName) return Promise.resolve();

  const p = loadLocalFamily(family, fileName)
    .catch(() => null)
    .finally(() => loadingPromises.delete(family));

  loadingPromises.set(family, p);
  return p;
}

export async function ensureFonts(familyList = []) {
  const families = Array.from(new Set(familyList.filter(Boolean)));
  await Promise.allSettled(families.map(ensureOneFamily));
}