'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { components } from '../../../types/api';

type DiaryEntry = components['schemas']['DiaryEntry'];

export default function DiaryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [entry, setEntry] = useState<DiaryEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`http://localhost:8000/entries/${params.id}`)
            .then((res) => res.json())
            .then((data) => {
                setEntry(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this memory?')) return;

        try {
            const res = await fetch(`http://localhost:8000/entries/${params.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                router.push('/diary');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="text-stone-400 font-serif italic text-center py-20">Reading the pages...</div>;
    if (!entry) return <div className="text-center py-20">Entry not found.</div>;

    return (
        <article className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-stone-400 font-serif italic">
                    <div className="flex items-center space-x-3">
                        <span>{new Date(entry.created_at || '').toLocaleDateString()}</span>
                        {entry.mood && (
                            <span className="bg-stone-100 px-2 py-0.5 rounded-full not-italic">
                                {entry.mood}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleDelete}
                        className="text-stone-300 hover:text-red-400 transition-colors"
                    >
                        Delete
                    </button>
                </div>
                <h1 className="text-5xl font-serif font-bold text-stone-900 leading-tight">
                    {entry.title}
                </h1>
            </div>

            <div className="prose prose-stone max-w-none text-stone-700 leading-loose text-lg whitespace-pre-wrap">
                {entry.content}
            </div>
        </article>
    );
}
