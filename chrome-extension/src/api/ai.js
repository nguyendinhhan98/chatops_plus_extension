/**
 * AI Module — Multi-provider AI Integration (Gemini, Groq, OpenRouter)
 * Provides summarization and analysis via REST APIs.
 */

/**
 * Call selected AI Provider API with a prompt
 * @param {string} prompt - The full prompt to send
 * @param {string} apiKey - API Key for the chosen provider
 * @param {string} [provider='gemini'] - Chosen provider ('gemini', 'groq', 'openrouter')
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.model] - Model name override
 * @param {number} [options.maxTokens] - Max output tokens (default: 1024)
 * @returns {Promise<string>} Generated text response
 */
export async function callAiProvider(prompt, apiKey, provider = 'gemini', options = {}) {
  if (provider === 'gemini') {
    const model = options.model || 'gemini-2.0-flash';
    const maxTokens = options.maxTokens || 1024;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.4,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 400 || status === 401) {
        throw new Error('AI_INVALID_KEY');
      } else if (status === 429) {
        throw new Error('AI_RATE_LIMIT');
      } else if (status === 403) {
        throw new Error('AI_FORBIDDEN');
      } else {
        throw new Error(`AI_ERROR_${status}`);
      }
    }

    const data = await response.json();
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('AI_EMPTY_RESPONSE');
    }

    const content = candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error('AI_EMPTY_RESPONSE');
    }

    return content.parts.map(p => p.text || '').join('');
  }

  // Groq and OpenRouter share OpenAI-compatible REST formats
  let url, model, headers;
  if (provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    model = options.model || 'llama-3.3-70b-versatile';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  } else if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    model = options.model || 'openrouter/free';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/nguyendinhhan98/mcp-chatops',
      'X-Title': 'ChatOps++ Chrome Extension'
    };
  } else {
    throw new Error('AI_INVALID_PROVIDER');
  }

  const body = {
    model: model,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    max_tokens: options.maxTokens || 1024
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 400 || status === 401) {
      throw new Error('AI_INVALID_KEY');
    } else if (status === 429) {
      throw new Error('AI_RATE_LIMIT');
    } else if (status === 403) {
      throw new Error('AI_FORBIDDEN');
    } else {
      throw new Error(`AI_ERROR_${status}`);
    }
  }

  const data = await response.json();
  const choices = data.choices;
  if (!choices || choices.length === 0) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  const message = choices[0].message;
  if (!message || !message.content) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  return message.content;
}

/**
 * Summarize a text content
 * @param {string} text - The text to summarize
 * @param {string} apiKey - API Key for the chosen provider
 * @param {string} [lang='vi'] - Output language: 'vi' or 'en'
 * @param {string} [provider='gemini'] - Chosen provider
 * @returns {Promise<string>} Summary text
 */
export async function summarizeText(text, apiKey, lang = 'vi', provider = 'gemini') {
  const langInstruction = lang === 'vi'
    ? 'Trả lời bằng tiếng Việt.'
    : 'Reply in English.';

  const prompt = `You are a helpful assistant that summarizes content concisely and clearly.

${langInstruction}

Please summarize the following content in a clear, concise format. Use bullet points for key points. Keep it brief but comprehensive:

---
${text}
---

Summary:`;

  return callAiProvider(prompt, apiKey, provider);
}

/**
 * Analyze text with a custom action/prompt
 * @param {string} text - The text to analyze
 * @param {string} apiKey - API Key for the chosen provider
 * @param {string} action - The analysis action type
 * @param {string} [lang='vi'] - Output language: 'vi' or 'en'
 * @param {string} [provider='gemini'] - Chosen provider
 * @returns {Promise<string>} Analysis result
 */
export async function analyzeText(text, apiKey, action = 'summarize', lang = 'vi', provider = 'gemini') {
  const langInstruction = lang === 'vi'
    ? 'Trả lời bằng tiếng Việt.'
    : 'Reply in English.';

  const prompts = {
    summarize: `You are a helpful assistant. ${langInstruction}

Summarize the following content concisely using bullet points for key points:

---
${text}
---`,

    actionItems: `You are a project manager assistant. ${langInstruction}

Extract all action items, tasks, and to-dos from the following content. Format as a numbered checklist:

---
${text}
---`,

    translate: lang === 'vi'
      ? `Translate the following content to Vietnamese. Keep the formatting:

---
${text}
---`
      : `Translate the following content to English. Keep the formatting:

---
${text}
---`,

    rewrite: `You are a professional writer. ${langInstruction}

Rewrite the following content in a more professional and clear tone. Keep the key information:

---
${text}
---`
  };

  const prompt = prompts[action] || prompts.summarize;
  return callAiProvider(prompt, apiKey, provider);
}

/**
 * Validate an API key by making a small test request
 * @param {string} apiKey - The API key to validate
 * @param {string} [provider='gemini'] - The AI provider name
 * @returns {Promise<boolean>} true if valid
 */
export async function validateAiApiKey(apiKey, provider = 'gemini', modelName = null) {
  if (!apiKey || apiKey.trim().length === 0) {
    return { isValid: false, errorType: 'key' };
  }

  try {
    if (provider === 'gemini') {
      const model = modelName || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 5 }
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        return { isValid: true, errorType: null };
      }

      const status = response.status;
      if (status === 404) {
        return { isValid: false, errorType: 'model' };
      } else if (status === 400 || status === 401 || status === 403) {
        try {
          const data = await response.json();
          const msg = data.error?.message?.toLowerCase() || '';
          if (msg.includes('not found') || msg.includes('model')) {
            return { isValid: false, errorType: 'model' };
          }
        } catch (_) {}
        return { isValid: false, errorType: 'key' };
      }
      return { isValid: false, errorType: 'unknown' };
    }

    let url, model;
    if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      model = modelName || 'llama-3.3-70b-versatile';
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      model = modelName || 'openrouter/free';
    } else {
      return { isValid: false, errorType: 'provider' };
    }

    const body = {
      model: model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      return { isValid: true, errorType: null };
    }

    const status = response.status;
    if (status === 401 || status === 403) {
      return { isValid: false, errorType: 'key' };
    }

    try {
      const data = await response.json();
      const msg = data.error?.message?.toLowerCase() || '';
      const code = data.error?.code?.toLowerCase() || '';
      if (msg.includes('model') || msg.includes('not found') || code.includes('model_not_found') || status === 404) {
        return { isValid: false, errorType: 'model' };
      }
    } catch (_) {}

    return { isValid: false, errorType: 'key' };
  } catch {
    return { isValid: false, errorType: 'network' };
  }
}

/**
 * Backward compatibility wrapper
 */
export async function validateGeminiApiKey(apiKey) {
  const result = await validateAiApiKey(apiKey, 'gemini');
  return result.isValid;
}
