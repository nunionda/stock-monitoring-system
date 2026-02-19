'use client';

import { useMarketData } from '../hooks/useMarketData';
import React, { useState, useEffect } from 'react';
import StockCard from '../components/StockCard';
import HistoryTable from '../components/HistoryTable';
import { AntiGravityStrategy, Candle } from '../utils/strategy';
import { runBacktest, BacktestResult } from '../utils/backtest';
import { API_BASE_URL } from '../utils/config';
import { TradeMonitor } from '../components/dashboard/TradeMonitor';
import { RiskMetrics } from '../components/dashboard/RiskMetrics';
import { AlgorithmInsight } from '../components/dashboard/AlgorithmInsight';
import { BacktestAnalysis } from '../components/dashboard/BacktestAnalysis';

export default function MarketDashboardPage() {
    const symbol = 'ES=F';
    const symbols = React.useMemo(() => [symbol], [symbol]);
    const emptyArray = React.useMemo(() => [], []);
    const { stocks, history, candles, loading, error, recordStat, refreshAll } = useMarketData(symbols, emptyArray);
    const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
    const [backtestLoading, setBacktestLoading] = useState(false);

    const names: Record<string, string> = {
        'ES=F': 'E-mini S&P 500 Futures'
    };

    const strategy = React.useMemo(() => new AntiGravityStrategy(), []);
    const currentCandles = candles[symbol] && Array.isArray(candles[symbol]) ? candles[symbol] : [];
    const strategyResult = currentCandles.length >= 22 ? strategy.generateSignal(currentCandles) : null;

    // Run backtest for 1 year on ES=F
    useEffect(() => {
        const fetchAndBacktest = async () => {
            setBacktestLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/stocks/candles/${symbol}?period=1y&interval=4h`);
                if (res.ok) {
                    const data: Candle[] = await res.json();
                    const results = await runBacktest(data);
                    setBacktestResult(results);
                }
            } catch (err) {
                console.error("Backtest failed:", err);
            } finally {
                setBacktestLoading(false);
            }
        };
        fetchAndBacktest();
    }, [symbol]);

    const handleRecord = async (s: string) => {
        const success = await recordStat(s);
        if (success) {
            alert(`${s} stats recorded successfully!`);
        } else {
            alert('Failed to record stats.');
        }
    };

    if (loading) return <div className="p-8 text-stone-400 font-serif italic">Loading market analysis...</div>;

    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-8 space-y-6">
                <div className="bg-rose-50 border border-rose-200 p-8 rounded-lg shadow-sm text-center">
                    <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.326.188 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Market Data Connection Issue</h2>
                    <p className="text-stone-600 mb-6 max-w-md mx-auto">{error}</p>
                    <button
                        onClick={() => refreshAll()}
                        className="bg-stone-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors shadow-lg"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    const data = stocks[symbol];
    const stockHistory = history[symbol] || [];

    const getSignalStyle = (signal: string) => {
        switch (signal) {
            case 'STRONG_BUY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'PYRAMID_BUY': return 'bg-teal-50 text-teal-700 border-teal-200';
            case 'STRONG_SELL': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'PYRAMID_SELL': return 'bg-pink-50 text-pink-700 border-pink-200';
            case 'EXIT_LONG': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'EXIT_SHORT': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-stone-50 text-stone-700 border-stone-200';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 flex items-center gap-3">
                        S&P 500 Dashboard
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-sans tracking-widest">V4</span>
                    </h1>
                    <p className="text-stone-500 font-serif italic mt-1 flex items-center gap-2">
                        Institutional Volatility Breakout & Risk Management
                        <span className="text-[8px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 uppercase font-bold tracking-tighter shadow-sm">Institutional Grade</span>
                    </p>
                </div>
                {strategyResult && (
                    <div className="text-right">
                        <div className={`inline-block px-4 py-2 rounded-lg font-bold text-sm tracking-widest uppercase border-2 shadow-sm ${getSignalStyle(strategyResult.signal)}`}>
                            Signal: {strategyResult.signal.replace('_', ' ')}
                        </div>
                    </div>
                )}
            </header>

            <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {data ? (
                            <StockCard
                                symbol={symbol}
                                data={data}
                                name={names[symbol]}
                                isFixed={true}
                                onRecord={handleRecord}
                            />
                        ) : (
                            <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex items-center justify-center h-64 border-dashed">
                                <p className="text-stone-400 italic">Fetching market data for {symbol}...</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* Live / Manual Trade Monitor */}
                        <TradeMonitor
                            symbol={symbol}
                            data={data}
                            backtestResult={backtestResult}
                            strategyResult={strategyResult}
                        />

                        {strategyResult && <RiskMetrics strategyResult={strategyResult} />}

                        <AlgorithmInsight strategyResult={strategyResult} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-serif font-bold text-stone-800">ATR Persistence Database</h3>
                    </div>
                    <HistoryTable symbol={symbol} history={stockHistory} />
                </div>

                <BacktestAnalysis
                    backtestResult={backtestResult}
                    backtestLoading={backtestLoading}
                />
            </div>

            <footer className="bg-stone-900 text-stone-100 p-8 rounded-lg shadow-xl">
                <h3 className="text-xl font-serif font-bold mb-4">Market Regime Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-stone-400">Institutional Volatility Tracking</p>
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Monitoring S&P 500 Futures (ES) is critical for understanding global risk sentiment.
                            Capturing <b>ATR</b> data helps in determining appropriate position sizing and identifying volatility regimes.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-stone-400">Database & Trends</p>
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Consistent recording of daily stats builds a robust historical data set, allowing for
                            the visualization of long-term structural changes in market volatility.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
