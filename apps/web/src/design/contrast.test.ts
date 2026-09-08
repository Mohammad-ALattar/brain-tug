import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../tailwind.config';

/**
 * Contrast floor for the palette.
 *
 * This game is read by nine-year-olds from the back of a classroom and by a
 * teacher glancing at a phone, so contrast is a functional requirement rather
 * than a compliance checkbox. Colours drift when someone reaches for a prettier
 * shade, and no other test in the suite would notice, so the pairs that actually
 * appear on screen are pinned here with their computed ratios.
 */

type Palette = Record<string, string | Record<string, string>>;

const colors = (
  tailwindConfig.theme?.extend?.colors ?? {}
) as unknown as Palette;

/** Resolves a Tailwind-style token path such as `ink.faint` to a hex string. */
function token(path: string): string {
  const [group, shade = 'DEFAULT'] = path.split('.');
  const entry = colors[group!];
  const value = typeof entry === 'string' ? entry : entry?.[shade];
  if (typeof value !== 'string') throw new Error(`No colour token at ${path}`);
  return value;
}

/** Relative luminance per WCAG 2.1, from an `#rrggbb` string. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter! + 0.05) / (darker! + 0.05);
}

const WHITE = '#ffffff';

/** Every surface a piece of body text can land on. */
const SURFACES = ['paper.card', 'paper.DEFAULT', 'paper.sunk'] as const;

describe('palette contrast', () => {
  describe('text on every surface tint', () => {
    // All three emphasis levels are used at 10-12px for uppercase labels, which
    // is small text by WCAG's definition and so needs the full 4.5:1.
    for (const ink of ['ink.DEFAULT', 'ink.muted', 'ink.faint']) {
      for (const surface of SURFACES) {
        it(`${ink} on ${surface} clears AA`, () => {
          expect(contrast(token(ink), token(surface))).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  });

  it('keeps the three emphasis levels visibly distinct', () => {
    // Meeting the floor is not enough on its own: if `muted` and `faint` land on
    // the same ratio the visual hierarchy collapses and every label looks
    // equally important.
    const onCard = (path: string) => contrast(token(path), token('paper.card'));

    expect(onCard('ink.DEFAULT')).toBeGreaterThan(onCard('ink.muted') * 1.5);
    expect(onCard('ink.muted')).toBeGreaterThan(onCard('ink.faint') * 1.3);
  });

  it('puts legible white text on both team fills', () => {
    // These carry team names and player counts in small bold uppercase.
    expect(contrast(WHITE, token('blueteam.600'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, token('redteam.600'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps team text legible on its own pale tint', () => {
    expect(contrast(token('blueteam.700'), token('blueteam.50'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('redteam.700'), token('redteam.50'))).toBeGreaterThanOrEqual(4.5);
    // Team colours are also used for scores against the panel background.
    expect(contrast(token('blueteam.700'), token('paper.card'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('redteam.700'), token('paper.card'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the countdown badge readable', () => {
    // The timer is amber with dark text on it, never white.
    expect(contrast(token('ink.DEFAULT'), token('timer'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the status colours usable as text, not only as dots', () => {
    expect(contrast(token('good'), token('paper.card'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('warn'), token('paper.card'))).toBeGreaterThanOrEqual(4.5);
  });

  it('distinguishes the two teams from each other, not just from the page', () => {
    // A colour-blind viewer relies on labels and position, but the two fills
    // should still differ in lightness so a photograph or a projector with a
    // poor colour profile does not render them identical.
    expect(contrast(token('blueteam.600'), token('redteam.600'))).toBeGreaterThan(1.2);
  });
});
