import { describe, expect, it } from 'vitest';
import { driftMessage, measureFeel, withinTolerance, type FeelSnapshot } from './feel';
import saved from './feel.json';

const snapshot = saved as FeelSnapshot;
const now = measureFeel();

describe('the feel of the water', () => {
  it('measures the same things the snapshot has', () => {
    expect(Object.keys(now).sort(), 'The list of feel measurements changed. Run npm run feel:snapshot after Gal has played it.').toEqual(
      Object.keys(snapshot).sort(),
    );
  });

  for (const [name, was] of Object.entries(snapshot)) {
    it(`${name}: ${was.label.replace('{n}', String(was.value))}`, () => {
      const value = now[name]?.value ?? null;
      if (!withinTolerance(was.value, value, was.tolerance)) expect.fail(driftMessage(name, was, value));
    });
  }
});
