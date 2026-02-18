'use client';

import { useState, useEffect } from 'react';
import { useMarketData } from '../hooks/useMarketData';
import StockCard from '../components/StockCard';
import HistoryTable from '../components/HistoryTable';
import WatchlistEditor from '../components/WatchlistEditor';

export default function MarketDashboardPage() {
    const fixedSymbols = ['005930.KS', '000660.KS'];
    const [customSymbols, setCustomSymbols] = useState<string[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [newSymbols, setNewSymbols] = useState<string[]>(['', '']);

    const { stocks, history, loading, recordStat } = useMarketData(fixedSymbols, customSymbols);

    const names: Record<string, string> = {
        '005930.KS': 'Samsung Electronics',
        '000660.KS': 'SK Hynix'
    };

    useEffect(() => {
        const saved = localStorage.getItem('custom_watchlist');
        if (saved) {
            const parsed = JSON.parse(saved);
            setCustomSymbols(parsed);
            setNewSymbols(parsed);
        } else {
            const defaults = ['AAPL', 'NVDA'];
            setCustomSymbols(defaults);
            setNewSymbols(defaults);
            localStorage.setItem('custom_watchlist', JSON.stringify(defaults));
        }
    }, []);

    const handleSaveCustom = () => {
        const validated = newSymbols.map(s => s.trim().toUpperCase()).filter(s => s !== '');
        setCustomSymbols(validated);
        localStorage.setItem('custom_watchlist', JSON.stringify(validated));
        setEditMode(false);
    };

    const handleSymbolChange = (index: number, value: string) => {
        const updated = [...newSymbols];
        updated[index] = value;
        setNewSymbols(updated);
    };

    const handleRecord = async (symbol: string) => {
        const success = await recordStat(symbol);
        if (success) {
            alert(`${symbol} stats recorded successfully!`);
        } else {
            alert('Failed to record stats.');
        }
    };

    if (loading) return <div className="p-8 text-stone-400 font-serif italic">Loading market data...</div>;

    const allDisplaySymbols = [...fixedSymbols, ...customSymbols];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900">Market Dashboard</h1>
                    <p className="text-stone-500 font-serif italic mt-1">Real-time Watchlist & Historical ATR Database</p>
                </div>
                <div className="text-right">
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className="text-xs font-medium text-stone-400 hover:text-stone-900 uppercase tracking-widest border border-stone-200 px-3 py-1 rounded transition-all"
                    >
                        {editMode ? 'Cancel Edit' : 'Edit Watchlist'}
                    </button>
                </div>
            </header>

            {editMode && (
                <WatchlistEditor
                    newSymbols={newSymbols}
                    onSymbolChange={handleSymbolChange}
                    onSave={handleSaveCustom}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {allDisplaySymbols.map((symbol, index) => {
                    const data = stocks[symbol];
                    const stockHistory = history[symbol] || [];
                    const isFixed = index < fixedSymbols.length;

                    return (
                        <div key={symbol || index} className="space-y-4">
                            {data ? (
                                <StockCard
                                    symbol={symbol}
                                    data={data}
                                    name={names[symbol]}
                                    isFixed={isFixed}
                                    onRecord={handleRecord}
                                />
                            ) : (
                                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex items-center justify-center h-64 border-dashed">
                                    <p className="text-stone-400 italic">{symbol ? `Fetching data for ${symbol}...` : 'Empty'}</p>
                                </div>
                            )}
                            <HistoryTable symbol={symbol} history={stockHistory} />
                        </div>
                    );
                })}
            </div>

            <footer className="bg-stone-900 text-stone-100 p-8 rounded-lg shadow-xl">
                <h3 className="text-xl font-serif font-bold mb-4">Strategic Monitoring</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-stone-400">Database Persistence</p>
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Clicking <b>Record Stats</b> captures current market metrics into your permanent database.
                            This enables long-term trend analysis and helps visualize how volatility (ATR) evolves over time.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-stone-400">Watchlist Flexibility</p>
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Your custom watchlist allows you to track emerging global leaders alongside KOSPI giants.
                            Settings are automatically saved for consistency across your daily monitoring sessions.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
