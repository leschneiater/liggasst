import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const checkedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.env']);
const findings = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath));
    else if (checkedExtensions.has(extname(entry.name)) || entry.name === '.env.example') files.push(absolutePath);
  }
  return files;
}

for (const file of await collectFiles(root)) {
  const path = relative(root, file);
  if (path === 'scripts/check-supabase-only.mjs') continue;
  const content = await readFile(file, 'utf8');
  if (/from\s+['"]firebase(?:\/|['"])/.test(content) || /VITE_FIREBASE_/.test(content)) {
    findings.push(`${path}: Firebase reference`);
  }
  if (/SupabaseAuthContext|SupabaseProtectedRoute/.test(content)) {
    findings.push(`${path}: duplicate authentication architecture`);
  }
}

if (findings.length) {
  console.error('Supabase-only architecture check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Supabase-only architecture check passed.');
