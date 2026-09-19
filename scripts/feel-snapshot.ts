/**
 * Re-measures how the water feels and saves it to src/sim/feel.json.
 * Only run this after Gal has played the change and likes it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { measureFeel } from '../src/sim/feel';

const path = new URL('../src/sim/feel.json', import.meta.url);
const before = (() => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
})();

const after = measureFeel();
writeFileSync(path, JSON.stringify(after, null, 2) + '\n');

for (const [name, entry] of Object.entries(after)) {
  const was = before[name]?.value;
  const note = was === undefined ? 'new' : was === entry.value ? 'same' : `was ${was}`;
  console.log(`${name}: ${entry.value} (${note})`);
}
