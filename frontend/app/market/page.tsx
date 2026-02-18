'use client';

import { useEffect, useState } from 'react';

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
    const [stocks, setStocks] = useState<Record<string, StockStats | null>>({
        '005930.KS': null,
        '000660.KS': null
    });
    const [loading, setLoading] = useState(true);

    const symbols = ['005930.KS', '000660.KS'];
    const names: Record<string, string> = {
        '005930.KS': 'Samsung Electronics',
        '000660.KS': 'SK Hynix'
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        const results: Record<string, StockStats | null> = {};
        for (const symbol of symbols) {
            try {
                const res = await fetch(`http://localhost:8000/stocks/stats/${symbol}`);
                if (res.ok) {
                    results[symbol] = await res.json();
                } else {
                    results[symbol] = null;
                }
            } catch (err) {
                console.error(`Failed to fetch stats for ${symbol}:`, err);
                results[symbol] = null;
            }
        }
        setStocks(results);
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-stone-400 font-serif italic">Loading market data...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900">Market Dashboard</h1>
                    <p className="text-stone-500 font-serif italic mt-1">Real-time KOSPI Monitoring & ATR Indicators</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Market Status</p>
                    <p className="text-sm font-serif font-bold text-stone-600">KOSPI</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {symbols.map(symbol => {
                    const data = stocks[symbol];
                    if (!data) return (
                        <div key={symbol} className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex items-center justify-center h-64">
                            <p className="text-stone-400 italic">No data available for {names[symbol]}</p>
                        </div>
                    );

                    const isPositive = data.change >= 0;

                    return (
                        <div key={symbol} className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-stone-900">{names[symbol]}</h2>
                                    <p className="text-sm text-stone-500 font-medium">{symbol}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-serif font-bold text-stone-900">₩{data.price.toLocaleString()}</p>
                                    <p className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                        {isPositive ? '▲' : '▼'} {Math.abs(data.change).toLocaleString()} ({Math.abs(data.change_percent)}%)
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">ATR (14d)</p>
                                    <p className="text-xl font-serif font-bold text-stone-800">₩{data.atr?.toLocaleString() || 'N/A'}</p>
                                    <p className="text-[10px] text-stone-400 italic">Avg True Range</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Volume (1d)</p>
                                    <p className="text-xl font-serif font-bold text-stone-800">{data.volume.toLocaleString()}</p>
                                    <p className="text-[10px] text-stone-400 italic">Shares Traded</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-4">
                                <div className="bg-stone-50 p-2 rounded text-center">
                                    <p className="text-[10px] text-stone-400 uppercase">Open</p>
                                    <p className="text-sm font-bold text-stone-700">₩{data.open.toLocaleString()}</p>
                                </div>
                                <div className="bg-stone-50 p-2 rounded text-center">
                                    <p className="text-[10px] text-stone-400 uppercase">High</p>
                                    <p className="text-sm font-bold text-stone-700">₩{data.high.toLocaleString()}</p>
                                </div>
                                <div className="bg-stone-50 p-2 rounded text-center">
                                    <p className="text-[10px] text-stone-400 uppercase">Low</p>
                                    <p className="text-sm font-bold text-stone-700">₩{data.low.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-stone-400 h-full transition-all duration-1000"
                                        style={{
                                            width: `${((data.price - data.low) / (data.high - data.low)) * 100}%`
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[9px] text-stone-400">Position in Daily Range</span>
                                    <span className="text-[9px] text-stone-400">{Math.round(((data.price - data.low) / (data.high - data.low)) * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-stone-900 text-stone-100 p-8 rounded-lg shadow-xl">
                <h3 className="text-xl font-serif font-bold mb-4">Market Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-stone-400">Volatility Analysis</p>
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Samsung Electronics current ATR is ₩{stocks['005930.KS']?.atr?.toLocaleString()}.
                            A higher ATR relative to price suggests increased volatility, while a lower ATR implies a period of consolidation.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-stone-400">Technical Context</p>
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Monitoring both ATR and daily range position helps identify potential breakout or reversal points.
                            Prices near the daily high with increasing ATR often indicate strong momentum.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
