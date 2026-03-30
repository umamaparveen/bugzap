export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'No prompt' });

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) return res.status(500).json({ error: 'API key not configured' });

    const models = [
      'llama3-8b-8192',
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'gemma2-9b-it'
    ];

    for (const model of models) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 2048
          })
        });

        if (!r.ok) {
          const err = await r.json();
          const msg = err.error?.message || '';
          if (r.status === 429 || r.status === 404 || msg.includes('quota') || msg.includes('not found')) continue;
          return res.status(500).json({ error: msg || 'API error' });
        }

        const data = await r.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) continue;
        return res.status(200).json({ result: text });

      } catch (e) {
        continue;
      }
    }

    return res.status(503).json({ error: 'busy' });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
