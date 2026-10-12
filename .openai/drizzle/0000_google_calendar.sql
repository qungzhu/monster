CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id TEXT PRIMARY KEY NOT NULL,
  token_ciphertext TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS google_oauth_states (
  state TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  return_to TEXT NOT NULL DEFAULT '/',
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expires_at
ON google_oauth_states(expires_at);
--> statement-breakpoint
PRAGMA optimize;
