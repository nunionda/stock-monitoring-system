import React from 'react';
import TradingViewChart from './TradingViewChart';
import { StockStats } from '../hooks/useMarketData';

interface StockCardProps {
    symbol: string;
    data: StockStats;
    name?: string;
    isFixed: boolean;
    onRecord: (symbol: string) => void;
}

export default React.memo(function StockCard({ symbol, data, name, isFixed, onRecord }: StockCardProps) {
    const isPositive = (data.change ?? 0) >= 0;

    return (
        <div className={`bg-white p-6 rounded-lg border ${isFixed ? 'border-stone-200' : 'border-stone-400 shadow-md'} shadow-sm space-y-6 relative overflow-hidden`}>
            {!isFixed && <div className="absolute top-0 right-0 bg-stone-100 text-[8px] px-2 py-0.5 font-bold uppercase tracking-tighter text-stone-400">Custom</div>}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-stone-900 truncate max-w-[220px]">{name || symbol}</h2>
                    <p className="text-sm text-stone-500 font-medium">{symbol}</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-serif font-bold text-stone-900">
                        {symbol.endsWith('.KS') ? '₩' : '$'}{(data.price ?? 0).toLocaleString()}
                    </p>
                    <p className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '▲' : '▼'} {Math.abs(data.change ?? 0).toLocaleString()} ({Math.abs(data.change_percent ?? 0)}%)
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
                    <p className="text-xl font-serif font-bold text-stone-800">{(data.volume ?? 0).toLocaleString()}</p>
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
                    onClick={() => onRecord(symbol)}
                    className="text-[10px] bg-stone-900 text-white px-4 py-2 rounded shadow-sm hover:bg-stone-800 transition-colors font-bold uppercase tracking-widest"
                >
                    Record Stats
                </button>
            </div>
        </div>
    );
});
