import { useEffect, useMemo, useState } from 'react';

import type { PlayerId } from '@braintug/shared';

import { usePlayers } from '../../../../store/selectors';

import { useGameStore } from '../../../../store/gameStore';

import { FinishLine } from './FinishLine';

import { PlayerRaceLane } from './PlayerRaceLane';

import { RaceGainFlash } from './RaceGainFlash';

import { RaceStreakFlash } from './RaceStreakFlash';

import { racePlayerSlots } from './raceMotion';

import { didOvertakeOnGain, laneHeightPx, raceLeaderIds } from './racePresentation';

import { useRaceModeState } from './selectors';

/** The visual hero of Brain Race: one lane per seated racer towards one finish. */
export function RaceTrack() {
  const teams = useGameStore((s) => s.state?.teams ?? null);
  const players = usePlayers();
  const race = useRaceModeState();
  const lastProgress = useGameStore((s) => s.lastProgress);
  const [overtakePlayerId, setOvertakePlayerId] = useState<PlayerId | null>(null);

  const slots = useMemo(() => {
    if (!teams) return [];
    return racePlayerSlots({ teams, players });
  }, [teams, players]);

  const namesById = useMemo(
    () => new Map(players.map((player) => [player.id, player.name])),
    [players],
  );

  const laneHeight = laneHeightPx(slots.length);
  const leaders = race ? raceLeaderIds(slots, race) : new Set<PlayerId>();

  useEffect(() => {
    if (!lastProgress || !race) return;

    const overtook = didOvertakeOnGain({
      playerId: lastProgress.playerId,
      gain: lastProgress.gain,
      race,
      slots,
    });

    if (!overtook) return;

    setOvertakePlayerId(lastProgress.playerId);
    const timer = window.setTimeout(() => setOvertakePlayerId(null), 1000);
    return () => window.clearTimeout(timer);
  }, [lastProgress, race, slots]);

  return (
    <section className="relative flex shrink-0 flex-col justify-center gap-1.5 rounded-panel border border-track-line bg-track p-3">
      {slots.map((slot) => (
        <PlayerRaceLane
          key={slot.playerId}
          slotIndex={slot.slotIndex}
          playerId={slot.playerId}
          teamId={slot.teamId}
          playerName={namesById.get(slot.playerId) ?? 'Player'}
          laneHeight={laneHeight}
          isLeading={leaders.has(slot.playerId)}
          showOvertake={overtakePlayerId === slot.playerId}
        />
      ))}
      <FinishLine />
      <RaceGainFlash />
      <RaceStreakFlash />
    </section>
  );
}
