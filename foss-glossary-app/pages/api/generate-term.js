import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  // 1. Check for authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { termName } = req.body;

  if (!termName) {
    return res.status(400).json({ error: 'termName is required' });
  }

  try {
    // 3. Call the GitHub Models API on the server
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GITHUB_MODELS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert in FOSS terminology. Generate a concise and accurate glossary entry in YAML format for the given term. The output must be a single YAML object. Include the fields: term, slug, definition, explanation, humorous_description, see_also, and tags. The slug should be a URL-friendly version of the term.`,
          },
          {
            role: 'user',
            content: `Generate a YAML entry for the term: "${termName}"`,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API request failed with status ${response.status}: ${errorBody}`);
    }

    const aiResult = await response.json();
    const generatedContent = aiResult.choices[0]?.message?.content;

    // 4. Return the generated content to the client
    res.status(200).json({ content: generatedContent });
  } catch (error) {
    console.error('Error calling AI API:', error.message);
    res.status(500).json({ error: 'Failed to generate term from AI API' });
  }
}
