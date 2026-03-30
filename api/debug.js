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
    const models = ['llama3-8b-8192', 'gemma2-9b-it', 'mixtral-8x7b-32768'];

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
          if (r.status === 429) continue;
          throw new Error(err.error?.message || 'API error');
        }

        const data = await r.json();
        return res.status(200).json({ result: data.choices[0].message.content });

      } catch (e) {
        if (e.message?.includes('429') || e.message?.includes('quota')) continue;
        throw e;
      }
    }

    return res.status(503).json({ error: 'busy' });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
