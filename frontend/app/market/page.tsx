'use client';

import { useEffect, useState, useRef } from 'react';
import TradingViewChart from '../components/TradingViewChart';

interface StockStats {
    symbol: string;
    price: number;
    change: number;
    change_percent: number;
    volume: number;
    atr: number | null;
    high: number;
    low: number;
    open: number;
}

export default function MarketDashboardPage() {
    const fixedSymbols = ['005930.KS', '000660.KS'];
    const [customSymbols, setCustomSymbols] = useState<string[]>([]);
    const [stocks, setStocks] = useState<Record<string, StockStats | null>>({});
    const [history, setHistory] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [newSymbols, setNewSymbols] = useState<string[]>(['', '']);
    const ws = useRef<WebSocket | null>(null);

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

    // WebSocket Connection
    useEffect(() => {
        const connectWS = () => {
            const socket = new WebSocket('ws://localhost:8000/ws/market');

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'stock_update') {
                    setStocks(prev => {
                        const current = prev[data.symbol];
                        if (!current) return prev;
                        return {
                            ...prev,
                            [data.symbol]: {
                                ...current,
                                price: data.price,
                                change: data.change,
                                change_percent: data.change_percent
                            }
                        };
                    });
                }
            };

            socket.onclose = () => {
                console.log('WebSocket closed, retrying in 5s...');
                setTimeout(connectWS, 5000);
            };

            ws.current = socket;
        };

        connectWS();
        return () => ws.current?.close();
    }, []);

    useEffect(() => {
        if (customSymbols.length > 0 || !loading) {
            fetchAllData();
            // Polling as fallback/backup for full stats
            const interval = setInterval(fetchStats, 60000);
            return () => clearInterval(interval);
        }
    }, [customSymbols]);

    const fetchAllData = async () => {
        await fetchStats();
        const allSymbols = [...fixedSymbols, ...customSymbols];
        for (const symbol of allSymbols) {
            if (symbol) fetchHistory(symbol);
        }
    };

    const fetchStats = async () => {
        const results: Record<string, StockStats | null> = {};
        const allSymbols = [...fixedSymbols, ...customSymbols];

        for (const symbol of allSymbols) {
            if (!symbol) continue;
            try {
                const res = await fetch(`http://localhost:8000/stocks/stats/${symbol}`);
                if (res.ok) {
                    results[symbol] = await res.json();
                }
            } catch (err) {
                console.error(`Failed to fetch stats for ${symbol}:`, err);
            }
        }
        setStocks(prev => ({ ...prev, ...results }));
        setLoading(false);
    };

    const fetchHistory = async (symbol: string) => {
        try {
            const res = await fetch(`http://localhost:8000/stocks/history/${symbol}`);
            if (res.ok) {
                const data = await res.json();
                setHistory(prev => ({ ...prev, [symbol]: data }));
            }
        } catch (err) {
            console.error(`Failed to fetch history for ${symbol}:`, err);
        }
    };

    const handleRecordStat = async (symbol: string) => {
        const data = stocks[symbol];
        if (!data) return;

        try {
            // Include a 'date' for the backend
            const payload = { ...data, date: new Date().toISOString() };
            const res = await fetch('http://localhost:8000/stocks/stats/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                alert(`${symbol} stats recorded successfully!`);
                fetchHistory(symbol);
            }
        } catch (err) {
            alert('Failed to record stats.');
        }
    };

    const handleSaveCustom = () => {
        const validated = newSymbols.map(s => s.trim().toUpperCase()).filter(s => s !== '');
        setCustomSymbols(validated);
        localStorage.setItem('custom_watchlist', JSON.stringify(validated));
        setEditMode(false);
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
                <div className="bg-stone-50 p-6 rounded-lg border border-dashed border-stone-300">
                    <h3 className="text-sm font-bold text-stone-800 mb-4 uppercase tracking-tight">Custom Watchlist (2 Stocks)</h3>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] text-stone-500 uppercase font-bold">Ticker 1</label>
                            <input
                                value={newSymbols[0]}
                                onChange={e => setNewSymbols([e.target.value, newSymbols[1]])}
                                placeholder="e.g. AAPL"
                                className="block w-32 px-3 py-2 bg-white border border-stone-200 rounded text-sm focus:ring-1 focus:ring-stone-400 outline-none shadow-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-stone-500 uppercase font-bold">Ticker 2</label>
                            <input
                                value={newSymbols[1]}
                                onChange={e => setNewSymbols([newSymbols[0], e.target.value])}
                                placeholder="e.g. NVDA"
                                className="block w-32 px-3 py-2 bg-white border border-stone-200 rounded text-sm focus:ring-1 focus:ring-stone-400 outline-none shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleSaveCustom}
                            className="px-6 py-2 bg-stone-900 text-white rounded text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm"
                        >
                            Save Selections
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {allDisplaySymbols.map((symbol, index) => {
                    const data = stocks[symbol];
                    const stockHistory = history[symbol] || [];
                    const isFixed = index < fixedSymbols.length;

                    if (!data) return (
                        <div key={symbol || index} className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex items-center justify-center h-64 border-dashed">
                            <p className="text-stone-400 italic">{symbol ? `Fetching data for ${symbol}...` : 'Empty'}</p>
                        </div>
                    );

                    const isPositive = data.change >= 0;

                    return (
                        <div key={symbol} className="space-y-4">
                            <div className={`bg-white p-6 rounded-lg border ${isFixed ? 'border-stone-200' : 'border-stone-400 shadow-md'} shadow-sm space-y-6 relative overflow-hidden`}>
                                {!isFixed && <div className="absolute top-0 right-0 bg-stone-100 text-[8px] px-2 py-0.5 font-bold uppercase tracking-tighter text-stone-400">Custom</div>}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-serif font-bold text-stone-900 truncate max-w-[220px]">{names[symbol] || symbol}</h2>
                                        <p className="text-sm text-stone-500 font-medium">{symbol}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-serif font-bold text-stone-900">
                                            {symbol.endsWith('.KS') ? '₩' : '$'}{data.price.toLocaleString()}
                                        </p>
                                        <p className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            {isPositive ? '▲' : '▼'} {Math.abs(data.change).toLocaleString()} ({Math.abs(data.change_percent)}%)
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">ATR (14d)</p>
                                        <p className="text-xl font-serif font-bold text-stone-800">{symbol.endsWith('.KS') ? '₩' : '$'}{data.atr?.toLocaleString() || 'N/A'}</p>
                                        <p className="text-[10px] text-stone-400 italic">Avg True Range</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Volume</p>
                                        <p className="text-xl font-serif font-bold text-stone-800">{data.volume.toLocaleString()}</p>
                                        <p className="text-[10px] text-stone-400 italic">Shares Traded</p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-stone-100">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase mb-3 tracking-widest">Live Technical Chart</p>
                                    <div className="rounded-lg overflow-hidden border border-stone-200">
                                        <TradingViewChart symbol={symbol} />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-stone-50">
                                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Daily Tracker</span>
                                    <button
                                        onClick={() => handleRecordStat(symbol)}
                                        className="text-[10px] bg-stone-900 text-white px-4 py-2 rounded shadow-sm hover:bg-stone-800 transition-colors font-bold uppercase tracking-widest"
                                    >
                                        Record Stats
                                    </button>
                                </div>
                            </div>

                            {/* History Table for this stock */}
                            {stockHistory.length > 0 && (
                                <div className="bg-stone-50 p-4 rounded-lg border border-stone-100 overflow-hidden shadow-inner">
                                    <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-3 tracking-widest">Historical Database ({stockHistory.length})</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-[11px]">
                                            <thead>
                                                <tr className="text-left text-stone-400 border-b border-stone-200">
                                                    <th className="pb-2 font-medium">Date</th>
                                                    <th className="pb-2 font-medium">Price</th>
                                                    <th className="pb-2 font-medium">ATR</th>
                                                    <th className="pb-2 font-medium text-right">Change</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {[...stockHistory].reverse().slice(0, 5).map((h, i) => (
                                                    <tr key={i} className="text-stone-600">
                                                        <td className="py-2">{new Date(h.date).toLocaleDateString()}</td>
                                                        <td className="py-2 font-medium">{symbol.endsWith('.KS') ? '₩' : '$'}{h.price.toLocaleString()}</td>
                                                        <td className="py-2">{symbol.endsWith('.KS') ? '₩' : '$'}{h.atr?.toLocaleString() || '-'}</td>
                                                        <td className={`py-2 text-right font-bold ${h.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {h.change_percent > 0 ? '+' : ''}{h.change_percent}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {stockHistory.length > 5 && <p className="text-[9px] text-stone-400 mt-2 italic">Showing last 5 entries</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="bg-stone-900 text-stone-100 p-8 rounded-lg shadow-xl">
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
            </div>
        </div>
    );
}
