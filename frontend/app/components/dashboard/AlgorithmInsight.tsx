import React from 'react';
import { TradingSignal } from '../../utils/strategy';

interface AlgorithmInsightProps {
    strategyResult: TradingSignal | null;
}

export const AlgorithmInsight: React.FC<AlgorithmInsightProps> = React.memo(({ strategyResult }) => {
    return (
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
                    {strategyResult?.signal === 'STRONG_BUY' && `🏛 V5 Alpha Long: Triple Screen confirmed. ${strategyResult.config.FIXED_POSITION_SIZE ? `Entering ${strategyResult.positionSize} contract.` : `Scaling to ${Math.round(strategyResult.positionSize * 100)}% weight based on volatility.`}`}
                    {strategyResult?.signal === 'PYRAMID_BUY' && `🚀 V5 Pyramid: momentum acceleration. High confidence entry.`}
                    {strategyResult?.signal === 'STRONG_SELL' && `⚠ V5 Alpha Short: Macro breakdown. ${strategyResult.config.FIXED_POSITION_SIZE ? `Entering ${strategyResult.positionSize} contract.` : `Scaling to ${Math.round(strategyResult.positionSize * 100)}% weight.`}`}
                    {strategyResult?.signal === 'PYRAMID_SELL' && `🔥 V5 Pyramid: Bearish momentum acceleration.`}
                    {strategyResult?.signal === 'EXIT_LONG' && "⇲ Institutional Profit Target or Chandelier Exit. Realizing V5 gains."}
                    {strategyResult?.signal === 'EXIT_SHORT' && "⇱ Institutional Profit Target or Chandelier Exit. Realizing V5 gains."}
                    {strategyResult?.signal === 'HOLD' && "⚡ Monitoring: V5 Smart Filters active. Waiting for high-probability alignment."}
                </p>
            </div>
        </div>
    );
});
