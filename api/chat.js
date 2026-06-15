// Vercel serverless function: POST /api/chat
// Safely calls OpenAI-compatible chat endpoints via LiteLLM (if configured)
// or falls back to a mocked response.
//
// Requirements enforced:
// - No role:"tool" messages are sent.
// - No orphan tool messages are sent.
// - If tools are not required, we do not use tool calling at all.

import fetch from 'node-fetch';

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  // Remove tool-role messages completely.
  const filtered = messages
    .filter((m) => m && typeof m === 'object')
    .filter((m) => m.role !== 'tool');

  // Also guard against unknown/invalid roles.
  const allowed = new Set(['system', 'user', 'assistant']);
  return filtered.map((m) => {
    const role = allowed.has(m.role) ? m.role : 'user';
    const content = typeof m.content === 'string' ? m.content : '';
    return { role, content };
  });
}

function envReady() {
  // Primary: LiteLLM OpenAI-compatible endpoint
  // Configure one of:
  // - LITELLM_BASE_URL (e.g. https://your-litellm-host)
  // - LITELLM_MODEL (optional)
  // - LITELLM_API_KEY (optional)
  const litellmBase = process.env.LITELLM_BASE_URL || process.env.LITELLM_URL;
  const openaiKey = process.env.OPENAI_API_KEY;
  const azureKey = process.env.AZURE_OPENAI_API_KEY;

  return {
    litellmBase: typeof litellmBase === 'string' ? litellmBase : null,
    hasLitellm: Boolean(litellmBase),
    hasOpenAI: Boolean(openaiKey),
    hasAzure: Boolean(azureKey),
  };
}

async function callLiteLLM({ baseUrl, apiKey, model, messages, temperature }) {
  // LiteLLM typically exposes OpenAI-compatible routes:
  // POST {baseUrl}/chat/completions
  // Some deployments use /v1/chat/completions.
  // We'll attempt both.

  const candidates = [
    `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
  ];

  const body = {
    model,
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.2,
  };

  const lastErrors = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        lastErrors.push({ url, status: res.status, text });
        continue;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return { content, raw: data };
    } catch (e) {
      lastErrors.push({ url, error: String(e) });
    }
  }

  return { content: null, rawErrors: lastErrors };
}

async function callOpenAI({ apiKey, model, messages, temperature }) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model,
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.2,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return { content, raw: data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    const { messages, model, temperature, prompt } = req.body ?? {};

    // Allow sending either {messages} or {prompt}.
    const normalizedMessages = normalizeMessages(
      Array.isArray(messages) ? messages : prompt ? [{ role: 'user', content: String(prompt) }] : []
    );

    if (!normalizedMessages.length) {
      res.status(400).json({ error: 'Missing messages (or prompt).' });
      return;
    }

    const { litellmBase, hasLitellm, hasOpenAI } = envReady();

    // Choose model
    const chosenModel =
      (typeof model === 'string' && model) ||
      process.env.LITELLM_MODEL ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini';

    // Call order: LiteLLM first (if configured), then OpenAI.
    if (hasLitellm && litellmBase) {
      const { content, rawErrors } = await callLiteLLM({
        baseUrl: litellmBase,
        apiKey: process.env.LITELLM_API_KEY || process.env.LITELLM_KEY || process.env.LITELLM_AUTH,
        model: chosenModel,
        messages: normalizedMessages,
        temperature,
      });

      if (content) {
        res.status(200).json({ ok: true, content });
        return;
      }

      res.status(502).json({
        ok: false,
        error: 'LiteLLM call failed',
        details: rawErrors,
      });
      return;
    }

    if (hasOpenAI) {
      const { content } = await callOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: chosenModel,
        messages: normalizedMessages,
        temperature,
      });

      if (content) {
        res.status(200).json({ ok: true, content });
        return;
      }

      res.status(502).json({ ok: false, error: 'OpenAI returned empty content' });
      return;
    }

    // Dev-safe fallback (no external keys configured)
    res.status(200).json({
      ok: true,
      content:
        'Mock chat response: configure LITELLM_BASE_URL/LITELLM_API_KEY or OPENAI_API_KEY to enable real completions.',
    });
  } catch (e) {
    res.status(500).json({ error: 'Chat endpoint error', details: String(e?.message || e) });
  }
}

