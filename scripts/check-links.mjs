import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let failures = 0;
for (const file of htmlFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const refs = [...text.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
    const clean = ref.split('#')[0].split('?')[0];
    const target = path.join(root, clean);
    if (!fs.existsSync(target)) {
      console.error(`${file}: missing ${ref}`);
      failures++;
    }
  }
}
if (failures) process.exit(1);
console.log(`Checked ${htmlFiles.length} HTML files: all local references exist.`);
