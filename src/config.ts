import { config as configDotEnv } from 'dotenv';
import { envOr, envOrDie } from './utils';

configDotEnv();

export const version = '2.1.0';
export const cookie = envOrDie('PGN_MULE_COOKIE');
export const publicScheme = envOrDie('PUBLIC_SCHEME');
export const publicIP = envOrDie('PUBLIC_IP');
export const publicPort = parseInt(envOrDie('PUBLIC_PORT'));
export const slowPollRate = parseFloat(envOrDie('SLOW_POLL_RATE_SECONDS'));
export const minutesInactivitySlowDown = parseFloat(
  envOrDie('MINUTES_INACTIVITY_SLOWDOWN'),
);
export const minutesInactivityDie = parseFloat(
  envOrDie('MINUTES_INACTIVITY_DIE'),
);
export const userAgent = envOr(
  'PGN_MULE_UA',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
);
export const maxDelaySeconds = parseInt(envOrDie('DELAY_MAX_SECONDS'));

export const zulipUsername = envOrDie('ZULIP_USERNAME');
export const zulipApiKey = envOrDie('ZULIP_API_KEY');
export const zulipRealm = envOrDie('ZULIP_REALM');
export const zulipStream = envOrDie('ZULIP_STREAM');
export const zulipTopic = envOrDie('ZULIP_TOPIC');

export const lichessNoDelayKey = envOr(
  'LICHESS_NODELAY_KEY',
  'lichessNoDelayKey',
);
