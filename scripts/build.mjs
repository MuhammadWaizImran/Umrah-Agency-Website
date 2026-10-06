import { cp, mkdir, readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+|app\.js|styles\.css)"/g)) await access(path.join(root, match[1]));
await mkdir(path.join(root, 'public'), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'assets']) await cp(path.join(root, file), path.join(root, 'public', file), { recursive: true });
console.log('Ziyarat production build ready.');
