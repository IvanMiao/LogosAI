import * as Sentry from '@sentry/cloudflare';
import { createApp } from './app';
import type { CloudflareBindings } from './env';
import { createSentryOptions } from './monitoring/sentry';

const app = createApp();

export default Sentry.withSentry<CloudflareBindings>(
  createSentryOptions,
  app,
);
