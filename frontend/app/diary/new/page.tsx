'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewDiaryPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mood, setMood] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/entries/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, mood }),
            });

            if (res.ok) {
                router.push('/diary');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
                <label className="text-sm font-medium text-stone-500 uppercase tracking-widest">Title</label>
                <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="A story for today..."
                    className="w-full text-4xl font-serif font-bold bg-transparent outline-none border-none placeholder:text-stone-200"
                />
            </div>

            <div className="flex space-x-4">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-stone-500 uppercase tracking-widest">Mood</label>
                    <input
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        placeholder="Calm, Joyful, Inspired..."
                        className="w-full p-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-400 transition-colors"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-stone-500 uppercase tracking-widest">Story</label>
                <textarea
                    required
                    rows={15}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your heart out..."
                    className="w-full p-4 bg-white border border-stone-200 rounded-2xl outline-none focus:border-stone-400 transition-colors leading-relaxed min-h-[400px]"
                />
            </div>

            <div className="pt-6">
                <button
                    disabled={loading}
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 disabled:bg-stone-300 transition-colors"
                >
                    {loading ? 'Saving...' : 'Save Entry'}
                </button>
            </div>
        </form>
    );
}
