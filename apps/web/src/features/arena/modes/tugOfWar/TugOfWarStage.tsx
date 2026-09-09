import { useRef } from 'react';
import { TeamPanel } from './TeamPanel';
import { TugOfWarArena } from './TugOfWarArena';
import { useTugOfWarMotion } from './useTugOfWarMotion';
import './rope.css';

/**
 * The Tug of War classroom stage: two answer terminals around the rope field.
 *
 * Motion is owned here rather than on GameArena so a Brain Race match never
 * mounts rope CSS variables, and a Tug of War match never mounts race ones.
 */
export function TugOfWarStage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useTugOfWarMotion(rootRef);

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 gap-3">
      <TeamPanel teamId="blue" terminalNumber={1} />
      <TugOfWarArena />
      <TeamPanel teamId="red" terminalNumber={2} />
    </div>
  );
}
