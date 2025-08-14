import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";

interface AlpacaPosition {
  symbol: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  avg_entry_price: string;
  change_today: string;
}

export default function PositionsPanel() {
  const { data: positions, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/alpaca/positions'],
    queryFn: async (): Promise<AlpacaPosition[]> => {
      const response = await fetch('/api/alpaca/positions');
      if (!response.ok) throw new Error('Failed to fetch positions');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${(num * 100).toFixed(2)}%`;
  };

  if (error) {
    return (
      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Positions
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-gray-400 hover:text-white"
              data-testid="button-refresh-positions"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to fetch positions. Please check your Alpaca credentials.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Positions</span>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs text-gray-400">
              Live Data
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-gray-400 hover:text-white"
              data-testid="button-refresh-positions"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-navy-800 h-16 rounded-lg"></div>
            ))}
          </div>
        ) : positions?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg mb-2">No positions</div>
            <div className="text-sm">Your portfolio positions will appear here</div>
          </div>
        ) : (
          <div className="space-y-3">
            {positions?.map((position) => {
              const pnl = parseFloat(position.unrealized_pl);
              const pnlPercent = parseFloat(position.unrealized_plpc);
              const quantity = parseFloat(position.qty);
              const isPositive = pnl >= 0;

              return (
                <div
                  key={position.symbol}
                  className="bg-navy-800 rounded-lg p-4 border border-white/10"
                  data-testid={`position-${position.symbol}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white text-lg">
                        {position.symbol}
                      </div>
                      <div className="text-sm text-gray-400">
                        {Math.abs(quantity)} shares {position.side}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {formatCurrency(position.current_price)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Avg: {formatCurrency(position.avg_entry_price)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <div className="text-sm text-gray-400">Market Value</div>
                      <div className="font-semibold text-white">
                        {formatCurrency(position.market_value)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Cost Basis</div>
                      <div className="font-semibold text-white">
                        {formatCurrency(position.cost_basis)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center space-x-2">
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span
                        className={`font-semibold ${
                          isPositive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatCurrency(pnl)}
                      </span>
                    </div>
                    <div
                      className={`font-semibold ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatPercent(pnlPercent)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Data Source Attribution */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-500 text-center">
            Real-time position data from Alpaca Markets
          </div>
        </div>
      </CardContent>
    </Card>
  );
}