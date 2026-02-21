'use client';

import React from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import { AntiGravityStrategy } from '../../utils/strategy';
import { TradeSetupPanel } from '../../components/dashboard/TradeSetupPanel';

export default function TradeSetupPage() {
    const symbol = 'ES=F';
    const symbols = React.useMemo(() => [symbol], [symbol]);
    const emptyArray = React.useMemo(() => [], []);
    const { candles, loading, error, refreshAll } = useMarketData(symbols, emptyArray);

    const strategy = React.useMemo(() => new AntiGravityStrategy(), []);
    const currentCandles = candles[symbol] && Array.isArray(candles[symbol]) ? candles[symbol] : [];
    const strategyResult = currentCandles.length >= 22 ? strategy.generateSignal(currentCandles) : null;

    if (loading) return <div className="p-8 text-stone-400 font-serif italic">Loading setup analysis...</div>;

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-8 space-y-6">
                <div className="bg-rose-50 border border-rose-200 p-8 rounded-lg shadow-sm text-center">
                    <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Connection Issue</h2>
                    <p className="text-stone-600 mb-6 max-w-md mx-auto">{error}</p>
                    <button
                        onClick={() => refreshAll()}
                        className="bg-stone-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors shadow-lg"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-stone-900 flex items-center gap-3">
                        Tactical Setup
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-sans tracking-widest">V5</span>
                    </h1>
                    <p className="text-stone-500 font-serif italic mt-1">
                        Institutional Positioning & Entry Guide for S&P 500 Futures
                    </p>
                </div>
            </header>

            <div className="space-y-8">
                {strategyResult ? (
                    <TradeSetupPanel strategyResult={strategyResult} />
                ) : (
                    <div className="bg-stone-50 p-8 rounded-lg border border-stone-200 shadow-inner flex items-center justify-center h-64 border-dashed">
                        <p className="text-stone-400 italic">Insufficient data for Analysis (Need 200+ candles)</p>
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 pb-2 mb-4">
                        Strategy Context
                    </h3>
                    <div className="text-sm text-stone-600 space-y-2 leading-relaxed">
                        <p>
                            This tactical guide uses the <b>Strategy V5 Institutional Alpha</b> engine to identify high-probability setups.
                            It combines Triple Screen EMA filtering with volume trend confirmation to filter out noise.
                        </p>
                        <p>
                            • <b>Bullish Bias</b>: Only look for Long entries at the green trigger price.
                        </p>
                        <p>
                            • <b>Bearish Bias</b>: Only look for Short entries at the red trigger price.
                        </p>
                        <p>
                            • <b>Neutral</b>: The market is conflicting or ranging. Accummulate or wait for a breakout.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
