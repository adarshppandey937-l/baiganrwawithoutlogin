import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPSTREAM_ORIGIN = 'https://rwa-edulearnx.netlify.app';
const PORT = Number(process.env.PORT) || 3000;

async function proxyJson(req: Request, res: Response): Promise<void> {
  try {
    const targetUrl = `${UPSTREAM_ORIGIN}${req.originalUrl}`;
    const upstream = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': req.get('user-agent') || 'Mozilla/5.0',
      },
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    res.status(upstream.status).setHeader('Content-Type', contentType).send(text);
  } catch (err) {
    console.error('Upstream JSON proxy error:', err);
    res.status(502).json({ success: false, error: 'Upstream service unavailable' });
  }
}

async function streamUpstreamResponse(upstream: globalThis.Response, res: Response, fallbackContentType?: string): Promise<void> {
  const passHeaders = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control',
    'etag',
    'last-modified',
  ];
  res.status(upstream.status);
  for (const header of passHeaders) {
    const value = upstream.headers.get(header);
    if (value) {
      res.setHeader(header, value);
    }
  }
  if (!upstream.headers.get('content-type') && fallbackContentType) {
    res.setHeader('Content-Type', fallbackContentType);
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!upstream.body) {
    res.end();
    return;
  }

  const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
  nodeStream.on('error', () => {
    if (!res.headersSent) {
      res.status(502).end();
    } else {
      res.end();
    }
  });
  nodeStream.pipe(res);
}

async function startServer(): Promise<void> {
  const app = express();

  app.get('/api/rwa', proxyJson);
  app.get('/api/teachx/:endpoint', proxyJson);
  app.get('/api/video-details', proxyJson);

  app.get('/video', async (req: Request, res: Response) => {
    try {
      const targetUrl = `${UPSTREAM_ORIGIN}${req.originalUrl}`;
      const headers: Record<string, string> = {
        'User-Agent': req.get('user-agent') || 'Mozilla/5.0',
      };
      const range = req.get('range');
      if (range) {
        headers.Range = range;
      }
      const upstream = await fetch(targetUrl, { headers });
      await streamUpstreamResponse(upstream, res);
    } catch (err) {
      console.error('Video proxy error:', err);
      res.status(502).send('Video stream unavailable');
    }
  });

  app.get('/pdf', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    try {
      const upstreamUrl = `${UPSTREAM_ORIGIN}${req.originalUrl}`;
      const upstream = await fetch(upstreamUrl, {
        headers: {
          'User-Agent': req.get('user-agent') || 'Mozilla/5.0',
        },
      });
      if (upstream.ok) {
        res.setHeader('Content-Disposition', 'inline');
        await streamUpstreamResponse(upstream, res, 'application/pdf');
        return;
      }
    } catch {
      // Fallback to direct PDF fetch below
    }

    if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
      try {
        const direct = await fetch(rawUrl, {
          headers: {
            'User-Agent': req.get('user-agent') || 'Mozilla/5.0',
          },
        });
        if (direct.ok) {
          res.setHeader('Content-Disposition', 'inline');
          await streamUpstreamResponse(direct, res, 'application/pdf');
          return;
        }
      } catch (err) {
        console.error('Direct PDF proxy error:', err);
      }
    }

    res.status(502).send('PDF could not be loaded');
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
