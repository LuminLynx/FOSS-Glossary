import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

export default function DrafterPage() {
  const { data: session, status } = useSession();
  const [termName, setTermName] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedContent('');

    const response = await fetch('/api/generate-term', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termName, context }),
    });

    setIsLoading(false);

    if (!response.ok) {
      const err = await response.json();
      setError(err.error || 'An unexpected error occurred.');
    } else {
      const data = await response.json();
      setGeneratedContent(data.content);
    }
  };

  // Loading state for the session
  if (status === 'loading') {
    return <div className="p-8 text-center">Loading session...</div>;
  }

  // User not authenticated
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-8 bg-white shadow-md rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6">You must be signed in to use the AI Term Drafter.</p>
          <button
            onClick={() => signIn('github')}
            className="bg-gray-800 text-white font-bold py-2 px-4 rounded hover:bg-gray-700"
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated, show the drafter
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">AI Term Drafter</h1>
        <div>
          <span>Signed in as {session.user?.name}</span>
          <Link href="/" className="ml-4 text-blue-500 hover:underline">
            Home
          </Link>
        </div>
      </nav>

      <main className="p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label htmlFor="termName" className="block text-gray-700 font-bold mb-2">
              Term Name
            </label>

            <input
              id="termName"
              type="text"
              value={termName}
              onChange={(e) => setTermName(e.target.value)}
              placeholder="e.g., 'Technical Debt'"
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="context" className="block text-gray-700 font-bold mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide any extra details, like the origin of the term or a specific angle to focus on."
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Generating...' : '🤖 Generate with AI'}
          </button>
        </form>

        {error && (
          <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        {generatedContent && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Generated Content</h2>
            <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
              <code>{generatedContent}</code>
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
