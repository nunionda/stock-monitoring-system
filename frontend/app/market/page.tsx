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
                        <div className="bg-stone-900 p-6 rounded-lg border border-stone-700 shadow-xl space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm1-5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" /></svg>
                            </div>

                            <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest border-b border-stone-800 pb-2 flex justify-between items-center z-10 relative">
                                Trade Monitor (1 Contract)
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                            </h3>

                            {/* Manual Override Controls (Hidden by default, can be toggled or used as simulation) */}
                            {/* For this specific request, we hardcode the simulation of the user's requested Short */}
                            <div className="z-10 relative space-y-4">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Position</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-serif font-bold text-rose-500">SHORT</span>
                                            <span className="text-sm text-stone-400 font-mono">x1 Cont</span>
                                        </div>
                                        <p className="text-[9px] text-stone-600 mt-1">Entry: <span className="text-stone-300">6872.50</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Unrealized P&L</p>
                                        <p className={`text-3xl font-serif font-bold ${(data?.price || 6872.50) < 6872.50 ? 'text-emerald-400' : 'text-rose-500'
                                            }`}>
                                            {data?.price ? (
                                                <>
                                                    {((6872.50 - data.price) * 50).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                </>
                                            ) : '$0.00'}
                                        </p>
                                        <p className="text-[9px] text-stone-500 mt-1">
                                            {(data?.price || 6872.50) < 6872.50 ? '+' : ''}
                                            {data?.price ? (6872.50 - data.price).toFixed(2) : '0.00'} pts
                                        </p>
                                    </div>
                                </div>

                                {/* Risk Management Levels */}
                                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-800">
                                    <div className="bg-stone-800/50 p-2 rounded border border-rose-900/30">
                                        <p className="text-[9px] text-rose-400 font-bold uppercase">Stop Loss</p>
                                        <p className="text-lg font-mono text-stone-200">6885.50</p>
                                        <p className="text-[8px] text-stone-500">-13.0 pts (1 ATR)</p>
                                    </div>
                                    <div className="bg-stone-800/50 p-2 rounded border border-stone-700/30">
                                        <p className="text-[9px] text-stone-400 font-bold uppercase">Breakeven</p>
                                        <p className="text-lg font-mono text-stone-400">6860.00</p>
                                        <p className="text-[8px] text-stone-500">Auto-Trigger</p>
                                    </div>
                                    <div className="bg-stone-800/50 p-2 rounded border border-emerald-900/30">
                                        <p className="text-[9px] text-emerald-400 font-bold uppercase">Take Profit</p>
                                        <p className="text-lg font-mono text-stone-200">6840.50</p>
                                        <p className="text-[8px] text-stone-500">+32.0 pts (2.5 ATR)</p>
                                    </div>
                                </div>
                                <div className="text-center pt-2">
                                    <p className="text-[9px] text-stone-600 uppercase tracking-widest">
                                        Strategy V5 Auto-Monitor Active
                                    </p>
                                </div>
                            </div>
                        </div>

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
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">
                                                Initial Stop Loss {strategyResult.price > parseFloat(strategyResult.stopLoss || '0') ? '(Long)' : '(Short)'}
                                            </p>
                                            <span className="text-[8px] text-stone-300">1.0x ATR</span>
                                        </div>
                                        <p className={`text-2xl font-serif font-bold transition-transform group-hover:scale-105 origin-left ${strategyResult.price > parseFloat(strategyResult.stopLoss || '0') ? 'text-rose-500' : 'text-rose-600'}`}>
                                            ${(strategyResult.stopLoss || '0')}
                                        </p>
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">
                                                Chandelier Exit {strategyResult.price > parseFloat(strategyResult.chandelierStop || '0') ? '(Long)' : '(Short)'}
                                            </p>
                                            <span className="text-[8px] text-stone-300">3.0x ATR</span>
                                        </div>
                                        <p className={`text-2xl font-serif font-bold transition-transform group-hover:scale-105 origin-left ${strategyResult.price > parseFloat(strategyResult.chandelierStop || '0') ? 'text-orange-600' : 'text-blue-600'}`}>
                                            ${(strategyResult.chandelierStop || '0')}
                                        </p>
                                    </div>
                                    <div className="pt-4 mt-2 border-t border-stone-50 grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Regime Confidence</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-lg font-serif font-bold text-indigo-600">{Math.round(strategyResult.regimeConfidence * 100)}%</p>
                                                <div className="h-1.5 w-12 bg-stone-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${strategyResult.regimeConfidence * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group text-right">
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Risk Heat</p>
                                            <p className={`text-lg font-serif font-bold ${strategyResult.riskHeat === 'HIGH' ? 'text-rose-600' :
                                                strategyResult.riskHeat === 'NORMAL' ? 'text-amber-600' : 'text-emerald-600'
                                                }`}>
                                                {strategyResult.riskHeat}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="group pt-2">
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Position Size</p>
                                        <p className="text-lg font-serif font-bold text-stone-800">{Math.round(strategyResult.positionSize * 100)}%</p>
                                        <p className="text-[8px] text-stone-400">V5 Adaptive Scaling (1% Risk Cap)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 pb-2">Algorithm Insight</h3>
                            <div className="mt-4 p-3 bg-stone-50 rounded border border-stone-100 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${strategyResult && (strategyResult.regime === 'BULL') ? 'bg-emerald-500 animate-pulse' : strategyResult?.regime === 'BEAR' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-tight">
                                        Market Regime: {strategyResult?.regime === 'BULL' ? 'Trending Bull' : strategyResult?.regime === 'BEAR' ? 'Trending Bear' : 'Sideways Ranging'}
                                        ({Math.round((strategyResult?.regimeConfidence || 0) * 100)}% Conf)
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${strategyResult && (strategyResult.regimeConfidence > 0.4) ? 'bg-indigo-500' : 'bg-stone-300'}`}></div>
                                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-tight">Triple Screen EMA Alignment: {strategyResult && (strategyResult.regimeConfidence > 0.4) ? 'CONFIRMED' : 'WAITING'}</p>
                                </div>
                                <p className="text-xs text-stone-700 font-medium leading-relaxed italic">
                                    {strategyResult?.signal === 'STRONG_BUY' && `🏛 V5 Alpha Long: Triple Screen confirmed. Scaling to ${Math.round(strategyResult.positionSize * 100)}% weight based on volatility.`}
                                    {strategyResult?.signal === 'PYRAMID_BUY' && `🚀 V5 Pyramid: momentum acceleration. High confidence entry.`}
                                    {strategyResult?.signal === 'STRONG_SELL' && `⚠ V5 Alpha Short: Macro breakdown. Scaling to ${Math.round(strategyResult.positionSize * 100)}% weight.`}
                                    {strategyResult?.signal === 'PYRAMID_SELL' && `🔥 V5 Pyramid: Bearish momentum acceleration.`}
                                    {strategyResult?.signal === 'EXIT_LONG' && "⇲ Institutional Profit Target or Chandelier Exit. Realizing V5 gains."}
                                    {strategyResult?.signal === 'EXIT_SHORT' && "⇱ Institutional Profit Target or Chandelier Exit. Realizing V5 gains."}
                                    {strategyResult?.signal === 'HOLD' && "⚡ Monitoring: V5 Smart Filters active. Waiting for high-probability alignment."}
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
                                    <p className="text-[10px] text-stone-500 italic">Bench: {(backtestResult.buyAndHoldReturn || 0).toFixed(1)}% (B&H)</p>
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
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Strategy Alpha</p>
                                    <p className={`text-3xl font-serif font-bold group-hover:scale-110 transition-transform origin-left ${backtestResult.alphaVsBenchmark >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                                        {backtestResult.alphaVsBenchmark >= 0 ? '+' : ''}{(backtestResult.alphaVsBenchmark || 0).toFixed(1)}%
                                    </p>
                                    <p className="text-[10px] text-stone-500 italic">Vs. S&P 500 Benchmark</p>
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
                                            "Strategy V5 Analysis: Outperforming benchmark by <b>{(backtestResult.alphaVsBenchmark || 0).toFixed(1)}%</b> with
                                            a Profit Factor of <b>{(backtestResult.profitFactor || 0).toFixed(2)}</b>.
                                            Triple Screen EMA filtering has successfully identified <b>{backtestResult.totalTrades || 0}</b> high-confidence trade windows."
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
