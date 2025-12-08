import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function Component() {
  const { data: session } = useSession();
  if (session) {
    return (
      <div className="p-8">
        Signed in as {session.user?.email} <br />
        <button onClick={() => signOut()} className="bg-red-500 text-white p-2 rounded-md mt-2">
          Sign out
        </button>
        <div className="mt-4">
          <Link href="/drafter" className="text-blue-500 hover:underline font-bold">
            → Go to AI Term Drafter
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="p-8">
      Not signed in <br />
      <button
        onClick={() => signIn('github')}
        className="bg-green-500 text-white p-2 rounded-md mt-2"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}
