import { memo } from 'react';
import { streakTier, type TeamId } from '@mtow/shared';
import { Chip } from '../../components/Chip';
import { TEAM_THEME } from '../../design/teamTheme';
import { useRules, useTeamStreak } from '../../store/selectors';

export type TeamStreakProps = {
  teamId: TeamId;
};

/**
 * The `FULL FORCE` / `STREAK 3X` chip from the reference. The label and
 * multiplier come from the same rules the server scores with, so the display can
 * never disagree with the maths.
 */
export const TeamStreak = memo(function TeamStreak({ teamId }: TeamStreakProps) {
  const streak = useTeamStreak(teamId);
  const rules = useRules();
  const theme = TEAM_THEME[teamId];

  if (!rules) return null;
  const tier = streakTier(rules, streak);
  const boosted = tier.multiplier > 1;

  return (
    <div className="flex items-center justify-between gap-2">
      <Chip tone={boosted ? theme.chip : 'neutral'}>
        <span className={boosted ? '' : 'opacity-70'}>{tier.label}</span>
      </Chip>
      <div className="flex items-center gap-1.5">
        {boosted && (
          <span className={`tabular text-[11px] font-extrabold ${theme.text}`}>
            &times;{tier.multiplier.toFixed(2).replace(/0$/, '')}
          </span>
        )}
        <span className="tabular text-[11px] font-bold text-ink-faint">
          streak {streak}
        </span>
      </div>
    </div>
  );
});
