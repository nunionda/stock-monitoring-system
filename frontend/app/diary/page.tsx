'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { components } from '../../types/api';
import Calendar from '../components/Calendar';
import { isSameDay } from 'date-fns';

type DiaryEntry = components['schemas']['DiaryEntry'];

export default function DiaryListPage() {
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        fetch('http://localhost:8000/entries/')
            .then((res) => res.json())
            .then((data) => {
                setEntries(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const entryDates = entries.map((e) => new Date(e.created_at || ''));

    const filteredEntries = selectedDate
        ? entries.filter(e => isSameDay(new Date(e.created_at || ''), selectedDate))
        : entries;

    const handleDateSelect = (date: Date) => {
        if (selectedDate && isSameDay(date, selectedDate)) {
            setSelectedDate(null); // Deselect if clicking the same day
        } else {
            setSelectedDate(date);
        }
    };

    if (loading) return <div className="text-stone-400 font-serif italic">Loading memories...</div>;

    return (
        <div className="flex flex-col md:flex-row gap-12">
            {/* Sidebar: Calendar */}
            <div className="w-full md:w-72 flex-shrink-0">
                <Calendar
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    entryDates={entryDates}
                />
                {selectedDate && (
                    <button
                        onClick={() => setSelectedDate(null)}
                        className="mt-4 text-sm text-stone-400 hover:text-stone-900 transition-colors"
                    >
                        ← Show all entries
                    </button>
                )}
            </div>

            {/* Main Content: List */}
            <div className="flex-1 space-y-12">
                {selectedDate && (
                    <h3 className="text-lg font-serif font-bold text-stone-800 border-b border-stone-100 pb-2">
                        Entries for {selectedDate.toLocaleDateString()}
                    </h3>
                )}

                {filteredEntries.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-stone-400 font-serif italic">
                            {selectedDate
                                ? "No entries for this specific day."
                                : "No entries yet. Start your journey today."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-10">
                        {filteredEntries.map((entry) => (
                            <article key={entry.id} className="group flex flex-col items-start space-y-3">
                                <div className="flex items-center space-x-3 text-sm text-stone-400 font-serif italic">
                                    <span>{new Date(entry.created_at || '').toLocaleDateString()}</span>
                                    {entry.mood && (
                                        <span className="bg-stone-100 px-2 py-0.5 rounded-full not-italic">
                                            {entry.mood}
                                        </span>
                                    )}
                                </div>
                                <Link href={`/diary/${entry.id}`} className="block">
                                    <h2 className="text-2xl font-serif font-bold group-hover:text-stone-600 transition-colors">
                                        {entry.title}
                                    </h2>
                                </Link>
                                <p className="text-stone-600 line-clamp-3 leading-relaxed">
                                    {entry.content}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
