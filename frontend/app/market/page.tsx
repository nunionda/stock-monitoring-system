'use client';

import { useMarketData } from '../hooks/useMarketData';
import React, { useState, useEffect } from 'react';
import StockCard from '../components/StockCard';
import HistoryTable from '../components/HistoryTable';
import { AntiGravityStrategy, Candle } from '../utils/strategy';
import { runBacktest, BacktestResult } from '../utils/backtest';
import { API_BASE_URL } from '../utils/config';

export default function MarketDashboardPage() {
    const symbol = 'ES=F';
    const symbols = React.useMemo(() => [symbol], [symbol]);
    const { stocks, history, candles, loading, recordStat } = useMarketData(symbols, []);
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

    const data = stocks[symbol];
    const stockHistory = history[symbol] || [];

    const getSignalStyle = (signal: string) => {
        switch (signal) {
            case 'STRONG_BUY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'STRONG_SELL': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'EXIT_LONG': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'EXIT_SHORT': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-stone-50 text-stone-700 border-stone-200';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900">Anti-Gravity Dashboard</h1>
                    <p className="text-stone-500 font-serif italic mt-1">Institutional Volatility Breakout & Risk Management</p>
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
                        {strategyResult && (
                            <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 pb-2 flex justify-between items-center">
                                    Risk Metrics
                                    <span className="text-[8px] bg-stone-100 px-1 rounded text-stone-500">Live</span>
                                </h3>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="group">
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Wilder ATR (14d)</p>
                                        <p className="text-2xl font-serif font-bold text-stone-800 transition-colors group-hover:text-blue-600">${strategyResult.atr}</p>
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Initial Stop Loss</p>
                                            <span className="text-[8px] text-stone-300">1.0x ATR</span>
                                        </div>
                                        <p className="text-2xl font-serif font-bold text-rose-600 transition-transform group-hover:scale-105 origin-left">${(strategyResult.stopLoss || '0')}</p>
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Chandelier Exit</p>
                                            <span className="text-[8px] text-stone-300">3.0x ATR</span>
                                        </div>
                                        <p className="text-2xl font-serif font-bold text-orange-600 transition-transform group-hover:scale-105 origin-left">${(strategyResult.chandelierStop || '0')}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 pb-2">Algorithm Insight</h3>
                            <div className="mt-4 p-3 bg-stone-50 rounded border border-stone-100">
                                <p className="text-xs text-stone-700 font-medium leading-relaxed italic">
                                    {strategyResult?.signal === 'STRONG_BUY' && `✓ Scale-in Entry: Levels 1.0x & 1.5x ATR active. Volume >110%. Sentiment: Bullish Pyramiding.`}
                                    {strategyResult?.signal === 'STRONG_SELL' && `⚠ Scale-in Entry: Levels 1.0x & 1.5x ATR active. Volume >110%. Sentiment: Bearish Pyramiding.`}
                                    {strategyResult?.signal === 'EXIT_LONG' && "⇲ Long position risk threshold reached. Chandelier Exit triggered. Recommending exit."}
                                    {strategyResult?.signal === 'EXIT_SHORT' && "⇱ Short position risk threshold reached. Chandelier Exit triggered. Recommending exit."}
                                    {strategyResult?.signal === 'HOLD' && "• Price stabilizing within volatility bands. Volatility filters active. No immediate action required."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-serif font-bold text-stone-800">ATR Persistence Database</h3>
                    </div>
                    <HistoryTable symbol={symbol} history={stockHistory} />
                </div>

                <div className="bg-stone-900 text-stone-100 p-8 rounded-lg shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                        Institutional Backtest Analysis
                        <span className="text-[10px] bg-stone-700 px-2 py-0.5 rounded uppercase tracking-tighter text-stone-300">1 Year (ES=F)</span>
                    </h3>

                    {backtestLoading ? (
                        <p className="text-stone-400 italic">Calculating institutional grade performance metrics...</p>
                    ) : backtestResult ? (
                        <div className="space-y-10">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                <div className="space-y-1 group">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Net Profit Rate</p>
                                    <p className="text-3xl font-serif font-bold text-emerald-400 group-hover:scale-110 transition-transform origin-left">{(backtestResult.netReturnAfterCosts || 0).toFixed(1)}%</p>
                                    <p className="text-[10px] text-stone-500 italic">After Slippage & Rollover</p>
                                </div>
                                <div className="space-y-1 group">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Max Drawdown</p>
                                    <p className="text-3xl font-serif font-bold text-rose-500 group-hover:scale-110 transition-transform origin-left">{(backtestResult.mdd || 0).toFixed(1)}%</p>
                                    <p className="text-[10px] text-stone-500 italic">Worst-case equity drop</p>
                                </div>
                                <div className="space-y-1 group">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Win Rate (Net)</p>
                                    <p className="text-3xl font-serif font-bold text-blue-400 group-hover:scale-110 transition-transform origin-left">{(backtestResult.winRate || 0).toFixed(1)}%</p>
                                    <p className="text-[10px] text-stone-500 italic">Profitable trade freq</p>
                                </div>
                                <div className="space-y-1 group">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Profit Leakage</p>
                                    <p className="text-3xl font-serif font-bold text-stone-300 group-hover:scale-110 transition-transform origin-left">${(backtestResult.totalCosts || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    <p className="text-[10px] text-stone-500 italic">Total friction costs</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 border-y border-stone-800/50 py-8">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Profit Factor</p>
                                    <p className={`text-4xl font-serif font-bold ${(backtestResult.profitFactor || 0) >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {(backtestResult.profitFactor || 0).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-stone-500 italic leading-tight">Institutional target: &gt; 1.5</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Avg Hold Time</p>
                                    <p className="text-4xl font-serif font-bold text-stone-100">
                                        {(backtestResult.averageHoldTime || 0).toFixed(1)} <span className="text-sm font-sans text-stone-500 uppercase">Days</span>
                                    </p>
                                    <p className="text-[10px] text-stone-500 italic leading-tight">Average duration per trade</p>
                                </div>
                            </div>

                            <div className="bg-stone-800/50 p-6 rounded-lg border border-stone-700/50">
                                <div className="flex items-start gap-4">
                                    <div className="bg-amber-500/10 p-2 rounded text-amber-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.326.188 3 1.732 3z" /></svg>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-stone-300 uppercase tracking-widest leading-none">Friction & Reliability Analysis</p>
                                        <p className="text-sm text-stone-400 italic leading-relaxed">
                                            "With a sample of <b>{backtestResult.totalTrades || 0}</b> trades and a Profit Factor of <b>{(backtestResult.profitFactor || 0).toFixed(2)}</b>,
                                            the strategy shows <b>{(backtestResult.totalTrades || 0) >= 15 ? 'statistical significance' : 'limited data'}</b>.
                                            Average hold time of <b>{(backtestResult.averageHoldTime || 0).toFixed(1)}</b> days confirms the 샹들리에 exit efficiency."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-stone-500 italic">Unable to retrieve backtest data.</p>
                    )}
                </div>
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
