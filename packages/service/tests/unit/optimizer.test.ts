import { describe, it, expect } from 'bun:test';
import { snapToBucket, parseTransformOptions } from '../../src/lib/optimizer.js';

describe('snapToBucket', () => {
  const buckets = [320, 480, 640, 800, 1024, 1200, 1600, 1920];

  it('snaps to nearest bucket', () => {
    expect(snapToBucket(300, buckets)).toBe(320);
    expect(snapToBucket(823, buckets)).toBe(800);
    expect(snapToBucket(830, buckets)).toBe(800);
    expect(snapToBucket(950, buckets)).toBe(1024);
    expect(snapToBucket(2000, buckets)).toBe(1920);
  });

  it('keeps exact match', () => {
    expect(snapToBucket(800, buckets)).toBe(800);
  });
});

describe('parseTransformOptions - Bucketing', () => {
  it('snaps width to buckets', () => {
    const opts = parseTransformOptions({ w: '823' });
    expect(opts.width).toBe(800);
  });

  it('snaps height to buckets', () => {
    const opts = parseTransformOptions({ h: '1500' });
    expect(opts.height).toBe(1600);
  });

  it('snaps quality to buckets', () => {
    const opts = parseTransformOptions({ q: '82' });
    expect(opts.quality).toBe(85);
  });

  it('multiple transformations snap correctly', () => {
    const opts = parseTransformOptions({ w: '700', h: '350', q: '90' });
    expect(opts.width).toBe(640);
    expect(opts.height).toBe(320);
    expect(opts.quality).toBe(85);
  });
});
