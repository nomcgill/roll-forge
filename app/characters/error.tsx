"use client";

export default function CharactersError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    console.error(error);

    return (
        <main className="p-4 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-red-500">
                We couldn’t load your characters. Please try again.
            </p>
            <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
                Try Again
            </button>
        </main>
    );
}
