import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('gemini_api_key is not configured')) {
    return { status: 400, message: rawMessage };
  }
  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      message: 'API key invalid or permission denied. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return {
      status: 429,
      message: 'Rate limit reached on your Gemini API key. Please wait a moment and try again.',
    };
  }
  return { status: 500, message: rawMessage || 'Unexpected AI service error.' };
}

const SYSTEM_PROMPTS: Record<string, string> = {
  general:
    'You are Online AI, a friendly, intelligent, 100% free creative assistant. Respond clearly in the language the user writes in (Hindi, Hinglish, or English). Be practical, warm, and thorough.',
  bag_designer:
    'You are Online AI Product & Bag Design Studio Assistant. Help users design bags, totes, backpacks, and fashion products—suggest materials, dimensions, stitching details, colorways, product titles, and sales descriptions. If a photo is attached, inspect it carefully and give actionable design feedback.',
  social_caption:
    'You are Online AI Social & Marketing Writer. Create crisp, engaging Instagram/YouTube captions, hooks, and hashtags tailored to the user prompt and any uploaded photo.',
  video_script:
    'You are Online AI Video Scriptwriter. Write scene-by-scene scripts with visual direction, voiceover lines, and pacing suitable for reels, shorts, and product showcase videos.',
  story:
    'You are Online AI Creative Storyteller. Write vivid, engaging stories, dialogues, and scripts in Hindi, Hinglish, or English matching the requested tone.',
};

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'Online AI' });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, mode, attachments } = req.body as {
        messages?: Array<{ role: 'user' | 'assistant'; text: string }>;
        mode?: string;
        attachments?: Array<{ mimeType: string; data: string }>;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Please enter a prompt or upload a photo first.' });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = SYSTEM_PROMPTS[mode || 'general'] || SYSTEM_PROMPTS.general;

      const latestUser = messages[messages.length - 1];
      const historyContext = messages
        .slice(0, -1)
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'User' : 'Online AI'}: ${m.text}`)
        .join('\n\n');

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (Array.isArray(attachments)) {
        for (const att of attachments.slice(0, 4)) {
          if (att?.data && att?.mimeType) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data,
              },
            });
          }
        }
      }

      const combinedPrompt = historyContext
        ? `Previous conversation:\n${historyContext}\n\nLatest user message:\n${latestUser.text}`
        : latestUser.text;

      parts.push({ text: combinedPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction,
        },
      });

      const reply = (response.text ?? '').trim();
      if (!reply) {
        res.status(502).json({ error: 'Empty response received from Gemini.' });
        return;
      }

      res.json({ reply });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/image/generate', async (req, res) => {
    try {
      const { prompt, style, width, height, referenceImage } = req.body as {
        prompt?: string;
        style?: string;
        width?: number;
        height?: number;
        referenceImage?: { mimeType: string; data: string };
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Please describe the image or design you want to create.' });
        return;
      }

      const w = Math.max(320, Math.min(1600, Number(width || 1024)));
      const h = Math.max(320, Math.min(1600, Number(height || 1024)));
      const ai = getGeminiClient();

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (referenceImage?.data && referenceImage?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: referenceImage.mimeType,
            data: referenceImage.data,
          },
        });
      }

      parts.push({
        text: `Design a rich, artistic, multi-layered SVG illustration for the prompt: "${prompt.trim()}".
Style direction: ${style || 'Editorial Studio Vector'}.
Canvas dimensions: viewBox="0 0 ${w} ${h}" width="${w}" height="${h}".
Requirements for svgMarkup:
- Must be valid standalone <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">...</svg>.
- Include rich gradients (<defs><linearGradient>, <radialGradient>), layered shapes, atmospheric depth, lighting highlights, and crisp composition.
- No <script>, no <foreignObject>, no external <image href="http..."> URLs.
- Make sure the subject fills the composition harmoniously.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short 2-5 word artwork title.' },
              caption: { type: Type.STRING, description: '1-sentence visual description.' },
              svgMarkup: {
                type: Type.STRING,
                description: 'Complete standalone SVG markup matching the requested viewBox.',
              },
            },
            required: ['title', 'caption', 'svgMarkup'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        title?: string;
        caption?: string;
        svgMarkup?: string;
      };

      if (!parsed.svgMarkup) {
        res.status(502).json({ error: 'Model did not return valid artwork markup.' });
        return;
      }

      res.json({
        title: parsed.title || 'Online AI Artwork',
        caption: parsed.caption || prompt.trim(),
        svgMarkup: parsed.svgMarkup,
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/video/plan', async (req, res) => {
    try {
      const { prompt, durationSeconds, aspectRatio, effect, photoCount } = req.body as {
        prompt?: string;
        durationSeconds?: number;
        aspectRatio?: string;
        effect?: string;
        photoCount?: number;
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Please describe the video you want Online AI to direct.' });
        return;
      }

      const ai = getGeminiClient();
      const totalPhotos = Math.max(0, Number(photoCount || 0));

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Direct a creative short video storyboard for: "${prompt.trim()}".
Duration: ${durationSeconds || 6} seconds. Aspect Ratio: ${aspectRatio || '16:9'}.
Preferred particle effect hint: ${effect || 'auto'}.
Uploaded user photos available: ${totalPhotos} (indexed 0 to ${Math.max(0, totalPhotos - 1)}; use -1 if no photos).
Create 3 to 4 cohesive cinematic scenes with 6-digit hex colors (bgTop, bgBottom, accentColor), concise punchy headlines (max 6 words), expressive subtext (max 12 words), camera motion (zoom_in, zoom_out, pan_left, pan_right), particle effect (none, sunbeams, sparkles, petals, rain), and shapeMotif (waves, orbs, rays, grid, peaks).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              musicMood: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    headline: { type: Type.STRING },
                    subtext: { type: Type.STRING },
                    bgTop: { type: Type.STRING },
                    bgBottom: { type: Type.STRING },
                    accentColor: { type: Type.STRING },
                    motion: { type: Type.STRING },
                    effect: { type: Type.STRING },
                    shapeMotif: { type: Type.STRING },
                    photoIndex: { type: Type.INTEGER },
                  },
                  required: [
                    'headline',
                    'subtext',
                    'bgTop',
                    'bgBottom',
                    'accentColor',
                    'motion',
                    'effect',
                    'shapeMotif',
                    'photoIndex',
                  ],
                },
              },
            },
            required: ['title', 'subtitle', 'musicMood', 'scenes'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Online AI server running at http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
