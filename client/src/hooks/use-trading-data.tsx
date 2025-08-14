import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { 
  Portfolio, 
  Position, 
  Order, 
  MarketData, 
  TechnicalIndicators,
  InsertOrder,
  HistoricalData
} from "@shared/schema";

export function usePortfolio() {
  return useQuery<Portfolio>({
    queryKey: ["/api/portfolio"],
  });
}

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ["/api/positions"],
  });
}

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
}

export function useMarketData(symbol: string) {
  return useQuery<MarketData>({
    queryKey: ["/api/market-data", symbol],
    enabled: !!symbol,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    staleTime: 0, // Always consider data stale to trigger fresh fetches
  });
}

export function useTechnicalIndicators(symbol: string) {
  return useQuery<TechnicalIndicators>({
    queryKey: ["/api/technical-indicators", symbol],
    enabled: !!symbol,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });
}

export function useHistoricalData(symbol: string, timeframe: string = '1M', limit: number = 100) {
  return useQuery<HistoricalData[]>({
    queryKey: [`/api/historical-data/${symbol}?timeframe=${timeframe}&limit=${limit}`],
    enabled: !!symbol,
    staleTime: 30000, // 30 seconds
  });
}

export function useInfiniteHistoricalData(symbol: string, timeframe: string = '1M') {
  return useInfiniteQuery<HistoricalData[], Error>({
    queryKey: [`/api/historical-data/${symbol}`, timeframe, 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/historical-data/${symbol}?timeframe=${timeframe}&limit=100&offset=${pageParam}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 100 ? allPages.length * 100 : undefined;
    },
    initialPageParam: 0,
    enabled: !!symbol,
    staleTime: 30000,
  });
}

export function useEmergencyStop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/emergency-stop");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}
