import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useHistoricalData(symbol: string, timeframe: string = '1D', limit: number = 100) {
  return useQuery<HistoricalData[]>({
    queryKey: [`/api/historical-data/${symbol}?timeframe=${timeframe}&limit=${limit}`],
    enabled: !!symbol,
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
