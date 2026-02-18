'use client';

import { useState } from 'react';
import { components } from '../../types/api';

type Trade = components['schemas']['Trade'];

interface TradeFormProps {
    onTradeAdded: (trade: Trade) => void;
}

export default function TradeForm({ onTradeAdded }: TradeFormProps) {
    const [stockName, setStockName] = useState('');
    const [type, setType] = useState('Buy');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleStockNameChange = (val: string) => {
        setStockName(val);

        if (searchTimeout) clearTimeout(searchTimeout);

        if (val.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timeout = setTimeout(async () => {
            try {
                const res = await fetch(`http://localhost:8000/stocks/search?q=${val}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error('Search failed:', err);
            }
        }, 300);

        setSearchTimeout(timeout);
    };

    const handleFetchPrice = async (symbol: string) => {
        try {
            const res = await fetch(`http://localhost:8000/stocks/price/${symbol}`);
            if (res.ok) {
                const data = await res.json();
                setPrice(data.price.toString());
            }
        } catch (err) {
            console.error('Price fetch failed:', err);
        }
    };

    const handleSelectSuggestion = (s: any) => {
        setStockName(s.symbol);
        setSuggestions([]);
        setShowSuggestions(false);
        handleFetchPrice(s.symbol);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const newTrade = {
            stock_name: stockName,
            type,
            price: parseFloat(price),
            quantity: parseInt(quantity),
            notes,
        };

        try {
            const res = await fetch('http://localhost:8000/trades/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newTrade),
            });

            if (res.ok) {
                const data = await res.json();
                onTradeAdded(data);
                // Reset form
                setStockName('');
                setPrice('');
                setQuantity('');
                setNotes('');
            }
        } catch (err) {
            console.error('Failed to add trade:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 space-y-4 relative">
            <h3 className="text-xl font-serif font-bold text-stone-800">New Trade Entry</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1 relative">
                    <label className="text-sm font-medium text-stone-600">Stock Name / Ticker</label>
                    <input
                        type="text"
                        value={stockName}
                        onChange={(e) => handleStockNameChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        required
                        placeholder="e.g. AAPL"
                        autoComplete="off"
                        className="p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute z-20 top-full left-0 w-full bg-white border border-stone-200 mt-1 rounded shadow-lg max-h-60 overflow-y-auto">
                            {suggestions.map((s, idx) => (
                                <li
                                    key={idx}
                                    onClick={() => handleSelectSuggestion(s)}
                                    className="p-3 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0 flex flex-col"
                                >
                                    <span className="font-bold text-stone-900">{s.symbol}</span>
                                    <span className="text-xs text-stone-500 truncate">{s.name} ({s.exchange})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-stone-600">Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                    >
                        <option value="Buy">Buy</option>
                        <option value="Sell">Sell</option>
                    </select>
                </div>
                <div className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-stone-600">Price</label>
                        {stockName && (
                            <button
                                type="button"
                                onClick={() => handleFetchPrice(stockName)}
                                className="text-[10px] text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-tighter"
                            >
                                Fetch Price
                            </button>
                        )}
                    </div>
                    <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        placeholder="0.00"
                        className="p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                    />
                </div>
                <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-stone-600">Quantity</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        placeholder="0"
                        className="p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-stone-600">Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                    className="p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full bg-stone-800 text-white py-2 rounded font-medium hover:bg-stone-700 transition-colors disabled:bg-stone-400"
            >
                {submitting ? 'Adding...' : 'Add Trade Record'}
            </button>
        </form>
    );
}
