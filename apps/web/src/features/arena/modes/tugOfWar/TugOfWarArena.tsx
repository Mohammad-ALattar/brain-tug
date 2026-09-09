import { memo } from 'react';
import { usePlayers } from '../../../../store/selectors';
import { useTugModeState } from './selectors';
import { PullDeltaBadge } from './PullDeltaBadge';
import { PullingBanner } from './PullingBanner';
import { Rope } from './Rope';
import { RopePosition } from './RopePosition';
import { TugOfWarCharacters } from './TugOfWarCharacters';

/** More figures than this stops reading as a team and starts reading as a crowd. */
const MAX_FIGURES = 4;

/**
 * The central arena: the field, the distance scale, the rope with both teams
 * braced against it, and the pulling banner.
 *
 * Nothing here subscribes to `ropePosition`. Rope, marker and glow all read the
 * CSS custom properties that `useArenaMotion` writes on the arena root, so this
 * component renders only when the roster or the rules change. A pull moves the
 * rope without React doing any work at all.
 */
export const TugOfWarArena = memo(function TugOfWarArena() {
  const tug = useTugModeState();
  const players = usePlayers();

  const figures = (teamId: 'blue' | 'red'): number =>
    Math.min(
      MAX_FIGURES,
      Math.max(1, players.filter((p) => p.teamId === teamId && p.connected).length),
    );

  return (
    <section className="bt-panel flex h-full min-w-0 flex-1 flex-col gap-3 p-4">
      {tug && <RopePosition halfMetres={tug.arenaHalfMetres} />}

      {/* The field. Halves are tinted toward each team, as in the reference. */}
      <div className="relative flex-1 overflow-hidden rounded-card border border-field-line bg-field">
        <div className="absolute inset-0 flex">
          <div className="h-full w-1/2 bg-field-blue/70" />
          <div className="h-full w-1/2 bg-field-red/70" />
        </div>

        {/* Mown-grass lane lines. */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 1px, rgba(0,0,0,0) 1px 64px)',
          }}
        />

        {/* Goal lines: crossing one ends the match. */}
        <div className="absolute inset-y-0 left-0 w-[6px] bg-blueteam-500/70" />
        <div className="absolute inset-y-0 right-0 w-[6px] bg-redteam-500/70" />
        {/* Centre line. */}
        <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-timer" />

        {/* Tension glow, one element per side, opacity driven by CSS. */}
        <div aria-hidden className="bt-tension-blue pointer-events-none absolute inset-0" />
        <div aria-hidden className="bt-tension-red pointer-events-none absolute inset-0" />

        {/* Live rope marker, independent of the rope assembly. */}
        <div
          aria-hidden
          className="bt-rope-marker absolute inset-y-0 w-[2px] -translate-x-1/2 bg-ink/25"
        />

        {/* The rope assembly: both teams and the rope move together. */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="bt-rope-track flex items-end justify-center">
            <TugOfWarCharacters teamId="blue" count={figures('blue')} />
            <Rope width={280} />
            <TugOfWarCharacters teamId="red" count={figures('red')} />
          </div>
        </div>

        <PullDeltaBadge />
      </div>

      <PullingBanner />
    </section>
  );
});
