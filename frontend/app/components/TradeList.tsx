'use client';

import React from 'react';
import { components } from '../../types/api';
import { formatCurrency } from '../utils/formatters';

type Trade = components['schemas']['Trade'];

interface TradeListProps {
    trades: Trade[];
    onDelete: (id: number) => void;
    market: 'US' | 'KR';
}

export default React.memo(function TradeList({ trades, onDelete, market }: TradeListProps) {
    if (trades.length === 0) {
        return (
            <div className="text-center py-10 bg-stone-50 rounded-lg border border-dashed border-stone-300">
                <p className="text-stone-400 italic">No trades recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-stone-200">
            <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                    {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                                {new Date(trade.trade_date || '').toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-900">
                                {trade.stock_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${trade.type === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {trade.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                                {formatCurrency(trade.price, market)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                                {trade.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                                {formatCurrency(trade.price * trade.quantity, market)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => trade.id && onDelete(trade.id)}
                                    className="text-red-400 hover:text-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
