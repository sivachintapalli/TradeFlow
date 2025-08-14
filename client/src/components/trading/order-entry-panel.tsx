import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface AlpacaAccount {
  buying_power: string;
  portfolio_value: string;
  cash: string;
  equity: string;
  pattern_day_trader: boolean;
  daytrade_count: number;
}

export default function OrderEntryPanel() {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [timeInForce, setTimeInForce] = useState<"day" | "gtc">("day");
  const [extendedHours, setExtendedHours] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch account info
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['/api/alpaca/account'],
    queryFn: async (): Promise<AlpacaAccount> => {
      const response = await fetch('/api/alpaca/account');
      if (!response.ok) throw new Error('Failed to fetch account');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Check market status
  const { data: marketStatus } = useQuery({
    queryKey: ['/api/alpaca/market-status'],
    queryFn: async (): Promise<{ isOpen: boolean }> => {
      const response = await fetch('/api/alpaca/market-status');
      if (!response.ok) throw new Error('Failed to fetch market status');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Submit order mutation
  const submitOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit order');
      }
      return response.json();
    },
    onSuccess: (order) => {
      toast({
        title: "Order Submitted",
        description: `${side.toUpperCase()} ${quantity} ${symbol} - Order ID: ${order.id}`,
      });
      // Clear form
      setSymbol("");
      setQuantity("");
      setLimitPrice("");
      // Refresh orders and positions
      queryClient.invalidateQueries({ queryKey: ['/api/alpaca/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alpaca/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alpaca/account'] });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitOrder = async () => {
    if (!symbol || !quantity) {
      toast({
        title: "Missing Information",
        description: "Please enter symbol and quantity",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "limit" && !limitPrice) {
      toast({
        title: "Missing Limit Price",
        description: "Please enter limit price for limit orders",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      symbol: symbol.toUpperCase(),
      qty: parseInt(quantity),
      side,
      type: orderType,
      time_in_force: timeInForce,
      extended_hours: extendedHours,
      ...(orderType === "limit" && { limit_price: parseFloat(limitPrice) }),
    };

    submitOrderMutation.mutate(orderData);
  };

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Order Entry</span>
          <div className="flex items-center space-x-2">
            <Badge variant={marketStatus?.isOpen ? "default" : "secondary"} className="text-xs">
              {marketStatus?.isOpen ? "Market Open" : "Market Closed"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Summary */}
        {account && !accountLoading && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-navy-800 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-400">Buying Power</div>
              <div className="text-lg font-semibold text-green-400">
                ${parseFloat(account.buying_power).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Portfolio Value</div>
              <div className="text-lg font-semibold text-white">
                ${parseFloat(account.portfolio_value).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Pattern Day Trader Warning */}
        {account?.pattern_day_trader && (
          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-400">
              Pattern Day Trader Account - {account.daytrade_count} day trades used
            </AlertDescription>
          </Alert>
        )}

        {/* Symbol Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL"
            className="bg-navy-800 border border-white/20 text-white font-mono"
            data-testid="input-order-symbol"
          />
        </div>

        {/* Side Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Side</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setSide("buy")}
              className={`${
                side === "buy"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-navy-700 hover:bg-navy-600"
              }`}
              data-testid="button-buy"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </Button>
            <Button
              onClick={() => setSide("sell")}
              className={`${
                side === "sell"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-navy-700 hover:bg-navy-600"
              }`}
              data-testid="button-sell"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </Button>
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
          <Select value={orderType} onValueChange={(value: "market" | "limit") => setOrderType(value)}>
            <SelectTrigger className="bg-navy-800 border border-white/20 text-white" data-testid="select-order-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Number of shares"
            className="bg-navy-800 border border-white/20 text-white"
            data-testid="input-quantity"
          />
        </div>

        {/* Limit Price (conditional) */}
        {orderType === "limit" && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Limit Price</label>
            <Input
              type="number"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Price per share"
              className="bg-navy-800 border border-white/20 text-white"
              data-testid="input-limit-price"
            />
          </div>
        )}

        {/* Time in Force */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Time in Force</label>
          <Select value={timeInForce} onValueChange={(value: "day" | "gtc") => setTimeInForce(value)}>
            <SelectTrigger className="bg-navy-800 border border-white/20 text-white" data-testid="select-time-in-force">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="gtc">Good Till Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Extended Hours */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="extended-hours"
            checked={extendedHours}
            onChange={(e) => setExtendedHours(e.target.checked)}
            className="rounded"
            data-testid="checkbox-extended-hours"
          />
          <label htmlFor="extended-hours" className="text-sm text-gray-300">
            Extended Hours Trading
          </label>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitOrder}
          disabled={submitOrderMutation.isPending || !symbol || !quantity}
          className={`w-full font-semibold py-3 ${
            side === "buy"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
          data-testid="button-submit-order"
        >
          {submitOrderMutation.isPending ? (
            <span className="flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Submitting...
            </span>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              {side === "buy" ? "Buy" : "Sell"} {symbol || "Stock"}
            </>
          )}
        </Button>

        {/* Real Trading Notice */}
        <Alert className="border-blue-500/20 bg-blue-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-blue-400 text-xs">
            Paper Trading Mode - Orders executed via Alpaca Paper Trading API
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}