import React from 'react';
import { formatCurrency } from '../utils/formatters';

interface HoldingsSectionProps {
    symbolMap: Record<string, { quantity: number; totalCost: number; realizedPL: number }>;
    currentPrices: Record<string, number>;
    market: 'US' | 'KR';
}

export default function HoldingsSection({ symbolMap, currentPrices, market }: HoldingsSectionProps) {
    const activeHoldings = Object.entries(symbolMap).filter(([_, s]) => s.quantity > 0);

    return (
        <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
            <h3 className="text-lg font-serif font-bold text-stone-800 mb-4 uppercase tracking-tight">Current Holdings</h3>
            <div className="space-y-4">
                {activeHoldings.length > 0 ? (
                    activeHoldings.map(([symbol, s]) => {
                        const price = currentPrices[symbol] || 0;
                        const avgCost = s.totalCost / s.quantity;
                        const itemROI = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;
                        return (
                            <div key={symbol} className="flex justify-between items-center border-b border-stone-100 pb-2">
                                <div>
                                    <p className="font-bold text-stone-900">{symbol}</p>
                                    <p className="text-xs text-stone-500">{s.quantity} Shares @ {formatCurrency(avgCost, market)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-stone-900">{formatCurrency(s.quantity * price, market)}</p>
                                    <p className={`text-xs ${itemROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {itemROI >= 0 ? '+' : ''}{itemROI.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-sm text-stone-400 italic">No active holdings.</p>
                )}
            </div>
        </div>
    );
}
