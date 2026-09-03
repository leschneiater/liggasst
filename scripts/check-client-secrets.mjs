import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const checkedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.env', '.json', '.md', '.sql', '.yml', '.yaml']);
const checkedFiles = new Set(['.env.example', 'package.json']);

const forbiddenPatterns = [
  { label: 'private value exposed through VITE_*', pattern: /VITE_(?:DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY|[A-Z0-9_]*(?:SECRET|PRIVATE_KEY))\s*=/ },
  { label: 'direct database client in browser code', pattern: /(?:from\s+['"]mysql2|require\(['"]mysql2)/ },
  { label: 'database password embedded in source', pattern: /(?:password|password_hash)\s*:\s*['"][^'"]+['"]/i },
  { label: 'hardcoded test-login bypass', pattern: /(?:fillTestCredentials|test-user-id|Credenciais de teste)/ },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath));
    } else if (checkedExtensions.has(extname(entry.name)) || checkedFiles.has(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

const findings = [];
for (const file of await collectFiles(root)) {
  const content = await readFile(file, 'utf8');
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) findings.push(`${relative(root, file)}: ${label}`);
  }
  if (['.md', '.env'].includes(extname(file))
      && /(?:^|\n)\s*(?:senha|password)\s*:\s*(?!placeholder|example|exemplo|your_)[^\s`]+/i.test(content)) {
    findings.push(`${relative(root, file)}: plaintext password field`);
  }
}

if (findings.length > 0) {
  console.error('Potential client-side credential exposure detected:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Client-side credential exposure check passed.');
