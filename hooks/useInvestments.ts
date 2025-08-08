import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '@/services/api';

export type Holding = {
  symbol: string;
  company_name?: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  value: number;
  unrealized_gain: number;
  unrealized_gain_percent: number;
};

export type Trade = {
  id: string;
  symbol: string;
  company_name?: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees?: number;
  date: string;
};

export type WatchlistItem = { id: string; symbol: string; company_name?: string };

export type PortfolioSummary = {
  total_value: number;
  day_change: number;
  day_change_percent: number;
  overall_gain: number;
  overall_gain_percent: number;
  last_updated: number;
};

export function useInvestments() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, holds, recentTrades, wl] = await Promise.all([
        apiService.getInvestmentsSummary(),
        apiService.getHoldings('value'),
        apiService.getTrades(3),
        apiService.getWatchlist(),
      ]);
      setSummary(sum);
      setHoldings(holds);
      setTrades(recentTrades);
      setWatchlist(wl);
    } catch (e) {
      console.error('Failed to load investments:', e);
      setError(e instanceof Error ? e.message : 'Failed to load investments');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSummaryAndHoldings = useCallback(async () => {
    try {
      const [sum, holds] = await Promise.all([
        apiService.getInvestmentsSummary(),
        apiService.getHoldings('value'),
      ]);
      setSummary(sum);
      setHoldings(holds);
    } catch (e) {
      // keep prior values
    }
  }, []);

  const loadAllTrades = useCallback(async () => {
    try {
      const all = await apiService.getTrades();
      setTrades(all);
    } catch {}
  }, []);

  const addTrade = useCallback(async (trade: Omit<Trade, 'id'>) => {
    const created = await apiService.addTrade(trade);
    await Promise.all([refreshSummaryAndHoldings(), loadAllTrades()]);
    return created;
  }, [refreshSummaryAndHoldings, loadAllTrades]);

  const updateTrade = useCallback(async (id: string, updates: Partial<Pick<Trade, 'quantity' | 'price' | 'fees' | 'date'>>) => {
    const updated = await apiService.updateTrade(id, updates);
    await Promise.all([refreshSummaryAndHoldings(), loadAllTrades()]);
    return updated;
  }, [refreshSummaryAndHoldings, loadAllTrades]);

  const deleteTrade = useCallback(async (id: string) => {
    await apiService.deleteTrade(id);
    await Promise.all([refreshSummaryAndHoldings(), loadAllTrades()]);
  }, [refreshSummaryAndHoldings, loadAllTrades]);

  const removeHolding = useCallback(async (symbol: string) => {
    await apiService.removeHolding(symbol);
    await Promise.all([refreshSummaryAndHoldings(), loadAllTrades()]);
  }, [refreshSummaryAndHoldings, loadAllTrades]);

  const addToWatchlist = useCallback(async (item: { symbol: string; company_name?: string }) => {
    const created = await apiService.addToWatchlist(item);
    const list = await apiService.getWatchlist();
    setWatchlist(list);
    return created;
  }, []);

  const removeFromWatchlist = useCallback(async (idOrSymbol: string) => {
    await apiService.removeFromWatchlist(idOrSymbol);
    const list = await apiService.getWatchlist();
    setWatchlist(list);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    summary,
    holdings,
    trades,
    watchlist,
    loading,
    error,
    reload: loadAll,
    loadAllTrades,
    addTrade,
    updateTrade,
    deleteTrade,
    removeHolding,
    addToWatchlist,
    removeFromWatchlist,
  };
}


