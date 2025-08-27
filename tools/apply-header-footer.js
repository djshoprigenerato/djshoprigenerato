// tools/apply-header-footer.js
// Sistematore automatico delle viste EJS:
// - rimuove include di layouts/main
// - aggiunge include di layouts/header in cima e layouts/footer in fondo
// - salta views/layouts/*
// - idempotente

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VIEWS_DIR = path.join(ROOT, 'views');

function listEjsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // salta layouts
      if (path.relative(VIEWS_DIR, full).startsWith('layouts')) continue;
      out.push(...listEjsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ejs')) {
      out.push(full);
    }
  }
  return out;
}

function hasHeader(content) {
  return content.includes("include('../layouts/header'") || content.includes('include("../layouts/header"');
}

function removeMainIncludes(content) {
  // rimuove qualunque include di layouts/main (varianti)
  return content.replace(
    /<%-\s*include\((?:['"])(?:\.\.\/|\.\.\\|\.\/\.\.\/)?layouts\/main(?:\.ejs)?(?:['"])\)\s*%>\s*/g,
    ''
  );
}

function computeRelLayouts(file) {
  const rel = path
    .relative(path.dirname(file), path.join(VIEWS_DIR, 'layouts'))
    .replace(/\\/g, '/'); // windows-safe
  return rel || './layouts';
}

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // se ha già header, salta
  if (hasHeader(content)) return false;

  // pulisci include del vecchio main
  content = removeMainIncludes(content).trim();

  const relLayouts = computeRelLayouts(file);

  const header = `<%- include('${relLayouts}/header', { title: typeof title !== 'undefined' ? title : undefined }) %>`;
  const footer = `<%- include('${relLayouts}/footer') %>`;

  // aggiungi header e footer
  content = `${header}\n\n${content}\n\n${footer}\n`;

  fs.writeFileSync(file, content, 'utf8');
  return true;
}

function run() {
  if (!fs.existsSync(VIEWS_DIR)) {
    console.error('Errore: cartella "views/" non trovata. Esegui da radice progetto.');
    process.exit(1);
  }

  const files = listEjsFiles(VIEWS_DIR);
  let changed = 0;

  files.forEach((f) => {
    const updated = processFile(f);
    if (updated) {
      changed++;
      console.log('Aggiornato:', path.relative(ROOT, f));
    }
  });

  console.log(`\nFatto. File toccati: ${changed}/${files.length}`);
  console.log('Ora fai commit & push, poi redeploy su Render.');
}

run();
