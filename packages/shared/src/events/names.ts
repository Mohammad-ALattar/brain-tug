/** Commands a client sends to the server. All are validated on arrival. */
export const CLIENT_EVENTS = {
  createGame: 'create_game',
  joinGame: 'join_game',
  rejoinGame: 'rejoin_game',
  rejoinHost: 'rejoin_host',
  switchTeam: 'switch_team',
  startGame: 'start_game',
  submitAnswer: 'submit_answer',
  answerDraft: 'answer_draft',
  pauseGame: 'pause_game',
  resumeGame: 'resume_game',
  skipQuestion: 'skip_question',
  endGame: 'end_game',
  removePlayer: 'remove_player',
  movePlayer: 'move_player',
  watchArena: 'watch_arena',
  clockSync: 'clock_sync',
} as const;

/** Notifications the server pushes to clients. */
export const SERVER_EVENTS = {
  playerJoined: 'player_joined',
  playerLeft: 'player_left',
  playerReconnected: 'player_reconnected',
  teamJoined: 'team_joined',
  countdownStarted: 'countdown_started',
  questionStarted: 'question_started',
  answerResult: 'answer_result',
  progressApplied: 'progress_applied',
  draftUpdated: 'draft_updated',
  roundResolved: 'round_resolved',
  gameStateUpdated: 'game_state_updated',
  gamePaused: 'game_paused',
  gameResumed: 'game_resumed',
  questionSkipped: 'question_skipped',
  gameFinished: 'game_finished',
  gameError: 'game_error',
} as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type ServerEventName = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];

/** How a socket participates in a game, which decides what it is sent. */
export const CONNECTION_ROLES = ['host', 'player', 'arena'] as const;
export type ConnectionRole = (typeof CONNECTION_ROLES)[number];
