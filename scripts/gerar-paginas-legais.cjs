const { paginas } = require('./ssr-legal.cjs');
const { mkdirSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');
const raiz = join(__dirname, '..');
for (const p of paginas) {
  const dest = join(raiz, p.arquivo);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, p.html);
  console.log(dest, p.html.length, 'bytes');
}
