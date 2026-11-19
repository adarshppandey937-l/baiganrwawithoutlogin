const UPSTREAM_ORIGIN = 'https://rwa-edulearnx.netlify.app';

const PASS_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'cache-control',
  'etag',
  'last-modified',
];

function buildPassHeaders(upstream, fallbackContentType, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  for (const name of PASS_HEADERS) {
    const val = upstream.headers.get(name);
    if (val) {
      headers.set(name, val);
    }
  }
  if (!headers.has('content-type') && fallbackContentType) {
    headers.set('content-type', fallbackContentType);
  }
  headers.set('access-control-allow-origin', '*');
  return headers;
}

export default async (req) => {
  const incomingUrl = new URL(req.url);
  const pathname = incomingUrl.pathname;
  const search = incomingUrl.search;
  const userAgent = req.headers.get('user-agent') || 'Mozilla/5.0';

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, HEAD, OPTIONS',
        'access-control-allow-headers': 'Range, Content-Type, Accept',
      },
    });
  }

  if (pathname.startsWith('/api/')) {
    try {
      const targetUrl = `${UPSTREAM_ORIGIN}${pathname}${search}`;
      const upstream = await fetch(targetUrl, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': userAgent,
        },
      });
      const text = await upstream.text();
      const contentType =
        upstream.headers.get('content-type') || 'application/json; charset=utf-8';
      return new Response(text, {
        status: upstream.status,
        headers: {
          'content-type': contentType,
          'access-control-allow-origin': '*',
          'cache-control': 'no-store',
        },
      });
    } catch (err) {
      console.error('Netlify API proxy error:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Upstream service unavailable' }),
        {
          status: 502,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'access-control-allow-origin': '*',
          },
        }
      );
    }
  }

  if (pathname === '/video') {
    const rawUrl = incomingUrl.searchParams.get('url') || '';
    const reqHeaders = { 'User-Agent': userAgent };
    const range = req.headers.get('range');
    if (range) {
      reqHeaders.Range = range;
    }

    try {
      const upstream = await fetch(`${UPSTREAM_ORIGIN}${pathname}${search}`, {
        headers: reqHeaders,
      });
      if (upstream.ok || upstream.status === 206) {
        return new Response(upstream.body, {
          status: upstream.status,
          headers: buildPassHeaders(upstream),
        });
      }
    } catch (err) {
      console.error('Netlify upstream video proxy error:', err);
    }

    if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
      try {
        const direct = await fetch(rawUrl, { headers: reqHeaders });
        return new Response(direct.body, {
          status: direct.status,
          headers: buildPassHeaders(direct),
        });
      } catch (err) {
        console.error('Netlify direct video proxy error:', err);
      }
    }

    return new Response('Video stream unavailable', {
      status: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  if (pathname === '/pdf') {
    const rawUrl = incomingUrl.searchParams.get('url') || '';
    try {
      const upstream = await fetch(`${UPSTREAM_ORIGIN}${pathname}${search}`, {
        headers: { 'User-Agent': userAgent },
      });
      if (upstream.ok) {
        return new Response(upstream.body, {
          status: upstream.status,
          headers: buildPassHeaders(upstream, 'application/pdf', {
            'content-disposition': 'inline',
          }),
        });
      }
    } catch {
      // Fallback to direct PDF fetch below
    }

    if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
      try {
        const direct = await fetch(rawUrl, {
          headers: { 'User-Agent': userAgent },
        });
        if (direct.ok) {
          return new Response(direct.body, {
            status: direct.status,
            headers: buildPassHeaders(direct, 'application/pdf', {
              'content-disposition': 'inline',
            }),
          });
        }
      } catch (err) {
        console.error('Netlify direct PDF proxy error:', err);
      }
    }

    return new Response('PDF could not be loaded', {
      status: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response('Not Found', { status: 404 });
};

export const config = {
  path: ['/api/rwa', '/api/teachx/*', '/api/video-details', '/video', '/pdf'],
};
