/**
 * Cloudflare Worker: Hashnode webhook → GitHub repository_dispatch relay.
 *
 * Secrets (set in Cloudflare dashboard):
 *   HASHNODE_WEBHOOK_SECRET — shared secret configured in Hashnode webhook settings
 *   GITHUB_PAT             — fine-grained PAT with contents:write on the repo
 *
 * Deploy:
 *   npx wrangler deploy workers/hashnode-webhook.js --name hashnode-webhook
 */

const REPO = 'costajohnt/costajohnt.github.io';

async function verifySignature(body, signature, secret) {
  if (!signature || signature.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(signature)) {
    return false;
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBytes = new Uint8Array(
    signature.match(/.{2}/g).map((h) => parseInt(h, 16))
  );
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!env.HASHNODE_WEBHOOK_SECRET || !env.GITHUB_PAT) {
      return new Response('Server misconfigured', { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-hashnode-signature');

    try {
      if (!signature || !(await verifySignature(body, signature, env.HASHNODE_WEBHOOK_SECRET))) {
        return new Response('Invalid signature', { status: 401 });
      }
    } catch {
      return new Response('Invalid signature', { status: 401 });
    }

    try {
      const resp = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_PAT}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'hashnode-webhook-worker',
        },
        body: JSON.stringify({ event_type: 'hashnode-post-published' }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`GitHub dispatch failed: ${resp.status} ${text}`);
        return new Response('Failed to dispatch event', { status: 502 });
      }

      return new Response('OK', { status: 200 });
    } catch (err) {
      return new Response(`Dispatch failed: ${err.message}`, { status: 502 });
    }
  },
};
