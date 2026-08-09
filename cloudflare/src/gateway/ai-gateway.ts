import type { Context } from 'hono';
import type { CloudflareApp } from '../env';
import { ApiError } from '../http/api-error';
import { findUserSettings } from '../account/account.repository';
import { decryptUserSecret } from '../security/secret-encryption';

const FORWARDED_AI_PATHS = new Set([
  '/api/analyze',
  '/api/analyze/stream',
  '/api/anchors/explain',
  '/api/anchors/run',
]);

export function isForwardedAiPath(path: string): boolean {
  return FORWARDED_AI_PATHS.has(path);
}

function createGatewayHeaders(
  request: Request,
  apiKey: string,
  gatewaySecret: string | undefined,
): Headers {
  const headers = new Headers(request.headers);
  headers.delete('authorization');
  headers.delete('cookie');
  headers.delete('host');
  headers.delete('origin');
  headers.set('X-Gemini-Key', apiKey);
  if (gatewaySecret) {
    headers.set('X-LogosAI-Gateway', gatewaySecret);
  }
  return headers;
}

export async function proxyAiRequest(
  context: Context<CloudflareApp>,
): Promise<Response> {
  const user = context.get('user');
  const settings = await findUserSettings(context.env.LOGOSAI_DB, user.id);
  if (!settings?.encryptedApiKey || !settings.apiKeyIv) {
    throw new ApiError(
      401,
      'API_KEY_REQUIRED',
      'Add a Gemini API key in Settings before using AI features.',
    );
  }

  const apiKey = await decryptUserSecret(
    {
      ciphertext: settings.encryptedApiKey,
      iv: settings.apiKeyIv,
    },
    context.env.CREDENTIALS_ENCRYPTION_KEY,
    user.id,
  );
  const requestUrl = new URL(context.req.url);
  const targetUrl = new URL(
    `${requestUrl.pathname}${requestUrl.search}`,
    context.env.FASTAPI_ORIGIN,
  );

  try {
    return await fetch(targetUrl, {
      method: context.req.method,
      headers: createGatewayHeaders(
        context.req.raw,
        apiKey,
        context.env.GATEWAY_SHARED_SECRET,
      ),
      body: context.req.raw.body,
      redirect: 'manual',
    });
  } catch {
    throw new ApiError(
      502,
      'AI_SERVICE_UNAVAILABLE',
      'The analysis service is unavailable. Try again in a moment.',
    );
  }
}
