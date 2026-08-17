import { hasNewMemory } from '@/features/home/reveal-reaction';

describe('Reveal reaction', () => {
  it('does not animate when History is first loaded', () => {
    expect(hasNewMemory(null, [{ id: 'memory-1' }])).toBe(false);
  });

  it('animates only when a successful local or partner Reveal adds a Memory', () => {
    const previous = new Set(['memory-1']);
    expect(hasNewMemory(previous, [{ id: 'memory-1' }])).toBe(false);
    expect(hasNewMemory(previous, [{ id: 'memory-2' }, { id: 'memory-1' }])).toBe(true);
  });
});
