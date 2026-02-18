import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../utils/config';

export const useStockSearch = () => {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const searchStocks = useCallback((query: string) => {
        if (searchTimeout) clearTimeout(searchTimeout);

        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/stocks/search?q=${query}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                }
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setLoading(false);
            }
        }, 300);

        setSearchTimeout(timeout);
    }, [searchTimeout]);

    const fetchPrice = async (symbol: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/stocks/price/${symbol}`);
            if (res.ok) {
                const data = await res.json();
                return data.price;
            }
        } catch (err) {
            console.error('Price fetch failed:', err);
        }
        return null;
    };

    return { suggestions, loading, searchStocks, fetchPrice, setSuggestions };
};
