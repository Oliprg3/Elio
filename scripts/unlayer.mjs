// Rewrite the built CSS so it contains no @layer blocks or layer
// statements at all. Older TV WebViews (Chromium < 99) drop ENTIRE
// @layer blocks, which Tailwind v4 relies on; unwrapping makes the
// stylesheet safe on every engine that can parse plain CSS.
import fs from 'fs';
import glob from 'path';

function findFiles(dir) {
  const out = [];
  try {
    for (const name of fs.readdirSync(dir)) {
      const p = dir + '/' + name;
      const st = fs.statSync(p);
      if (st.isDirectory()) out.push(...findFiles(p));
      else if (name.endsWith('.css')) out.push(p);
    }
  } catch (_) {}
  return out;
}

function stripLayers(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('@layer', i);
    if (open === -1) { out += css.slice(i); break; }
    // statement form: @layer a, b;  -> remove entirely
    const semi = css.indexOf(';', open);
    const brace = css.indexOf('{', open);
    if (semi !== -1 && (brace === -1 || semi < brace)) {
      out += css.slice(i, open);
      i = semi + 1;
      continue;
    }
    if (brace === -1) { out += css.slice(i); break; }
    // block form: @layer name,... { body } -> keep body only
    let depth = 0;
    let j = brace;
    for (; j < css.length; j++) {
      const ch = css[j];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    out += css.slice(i, open) + css.slice(brace + 1, j);
    i = j + 1;
  }
  return out;
}

const files = findFiles('dist');
for (const f of files) {
  let css = fs.readFileSync(f, 'utf8');
  const once = stripLayers(css);
  css = once; // one pass flattens all nested layers by construction
  css = css.replace(/@layer[^\{;]*;/g, '');
  fs.writeFileSync(f, css);
}
console.log('unlayered:', files.length, 'css files');
