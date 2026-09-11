import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { HostToken, PublicPlayer, TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../design/teamTheme';
import { Chip } from '../../components/Chip';
import { request } from '../../realtime/socket';
import { usePlayers, useStatus, useTeamName } from '../../store/selectors';

export type LobbyRosterProps = {
  hostToken: HostToken;
};

export function LobbyRoster({ hostToken }: LobbyRosterProps) {
  const { t } = useTranslation('host');
  const players = usePlayers();
  const status = useStatus();
  const canBalance = status === 'lobby';

  const blue = players.filter((p) => p.teamId === 'blue');
  const red = players.filter((p) => p.teamId === 'red');
  const gap = Math.abs(blue.length - red.length);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
          {t('lobby.players', { count: players.length })}
        </h2>
        {players.length === 0 ? (
          <Chip tone="neutral">{t('lobby.waiting')}</Chip>
        ) : gap > 1 ? (
          <Chip tone="warn">{t('lobby.uneven', { gap })}</Chip>
        ) : (
          <Chip tone="good">{t('lobby.balanced')}</Chip>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TeamColumn teamId="blue" players={blue} hostToken={hostToken} canBalance={canBalance} />
        <TeamColumn teamId="red" players={red} hostToken={hostToken} canBalance={canBalance} />
      </div>
    </section>
  );
}

function TeamColumn({
  teamId,
  players,
  hostToken,
  canBalance,
}: {
  teamId: TeamId;
  players: PublicPlayer[];
  hostToken: HostToken;
  canBalance: boolean;
}) {
  const { t } = useTranslation(['host', 'common']);
  const theme = TEAM_THEME[teamId];
  const name = useTeamName(teamId);
  const other: TeamId = teamId === 'blue' ? 'red' : 'blue';
  const otherLabel = t(`lobby.team${other === 'blue' ? 'Blue' : 'Red'}`);

  return (
    <div className={`rounded-panel border ${theme.border} ${theme.tint} p-3`}>
      <div className="flex items-baseline justify-between px-1">
        <h3 className={`font-display text-base font-extrabold ${theme.textStrong}`}>{name}</h3>
        <span className={`tabular text-sm font-extrabold ${theme.text}`}>{players.length}</span>
      </div>

      {players.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs font-semibold text-ink-faint">
          {t('lobby.nobodyYet')}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-2 rounded-card border border-paper-line bg-paper-card px-2.5 py-2"
            >
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${
                  player.connected ? 'bg-emerald-500' : 'bg-ink-faint/50'
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                {player.name}
                {!player.connected ? (
                  <span className="ms-1.5 text-[10px] font-bold uppercase text-ink-faint">
                    {t('common:offline')}
                  </span>
                ) : null}
              </span>

              {canBalance ? (
                <RosterButton
                  label={t('lobby.movePlayer', { name: player.name, team: otherLabel })}
                  onClick={() =>
                    void request('move_player', {
                      hostToken,
                      playerId: player.id,
                      teamId: other,
                    }).catch(() => undefined)
                  }
                >
                  {teamId === 'blue' ? '\u2192' : '\u2190'}
                </RosterButton>
              ) : null}

              <RosterButton
                label={t('lobby.removePlayer', { name: player.name })}
                danger
                onClick={() =>
                  void request('remove_player', { hostToken, playerId: player.id }).catch(
                    () => undefined,
                  )
                }
              >
                &times;
              </RosterButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RosterButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'bt-focus grid h-8 w-8 shrink-0 place-items-center rounded-chip border text-sm font-extrabold transition',
        danger
          ? 'border-redteam-200 bg-redteam-50 text-redteam-700 hover:bg-redteam-100'
          : 'border-paper-line bg-paper-sunk text-ink-muted hover:bg-paper-line',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
