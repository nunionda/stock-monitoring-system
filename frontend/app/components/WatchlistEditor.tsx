import React from 'react';

interface WatchlistEditorProps {
    newSymbols: string[];
    onSymbolChange: (index: number, value: string) => void;
    onSave: () => void;
}

export default React.memo(function WatchlistEditor({ newSymbols, onSymbolChange, onSave }: WatchlistEditorProps) {
    return (
        <div className="bg-stone-50 p-6 rounded-lg border border-dashed border-stone-300">
            <h3 className="text-sm font-bold text-stone-800 mb-4 uppercase tracking-tight">Custom Watchlist (2 Stocks)</h3>
            <div className="flex flex-wrap gap-4 items-end">
                {newSymbols.map((symbol, i) => (
                    <div key={i} className="space-y-1">
                        <label className="text-[10px] text-stone-500 uppercase font-bold">Ticker {i + 1}</label>
                        <input
                            value={symbol}
                            onChange={e => onSymbolChange(i, e.target.value)}
                            placeholder="e.g. AAPL"
                            className="block w-32 px-3 py-2 bg-white border border-stone-200 rounded text-sm focus:ring-1 focus:ring-stone-400 outline-none shadow-sm"
                        />
                    </div>
                ))}
                <button
                    onClick={onSave}
                    className="px-6 py-2 bg-stone-900 text-white rounded text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm"
                >
                    Save Selections
                </button>
            </div>
        </div>
    );
});
