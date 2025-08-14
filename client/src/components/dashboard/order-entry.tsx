import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Send } from "lucide-react";
import { useCreateOrder, usePortfolio } from "@/hooks/use-trading-data";
import { useToast } from "@/hooks/use-toast";
import type { OrderFormData } from "@/types/trading";

interface OrderEntryProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

export default function OrderEntry({ symbol, onSymbolChange }: OrderEntryProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit' | 'stop' | 'stop-limit'>('market');
  const [quantity, setQuantity] = useState("100");
  const [price, setPrice] = useState("196.89");

  const createOrder = useCreateOrder();
  const { data: portfolio } = usePortfolio();
  const { toast } = useToast();

  const handleSubmitOrder = () => {
    const orderData: OrderFormData = {
      symbol,
      side,
      type,
      quantity: parseInt(quantity),
      price: type !== 'market' ? parseFloat(price) : undefined,
    };

    createOrder.mutate({
      symbol: orderData.symbol,
      side: orderData.side,
      type: orderData.type,
      quantity: orderData.quantity,
      price: orderData.price?.toString(),
    }, {
      onSuccess: () => {
        toast({
          title: "Order Submitted",
          description: `${side.toUpperCase()} order for ${quantity} shares of ${symbol} submitted successfully`,
        });
      },
      onError: () => {
        toast({
          title: "Order Failed",
          description: "Failed to submit order. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const orderValue = type !== 'market' ? parseFloat(price) * parseInt(quantity) : 0;

  return (
    <div className="glass-card rounded-xl p-6" data-testid="order-entry">
      <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
        <Send className="w-5 h-5" />
        <span>Order Entry</span>
      </h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
          <Input
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
            className="w-full bg-navy-800 border border-white/20 rounded-lg px-3 py-2 font-mono font-semibold text-white focus:border-purple-primary"
            data-testid="input-order-symbol"
          />
        </div>
        
        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setSide('buy')}
            className={`px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
              side === 'buy' 
                ? 'bg-green-bullish hover:bg-green-600 glow-green' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            data-testid="button-buy"
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            BUY
          </Button>
          <Button
            onClick={() => setSide('sell')}
            className={`px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
              side === 'sell' 
                ? 'bg-red-bearish hover:bg-red-600 glow-red' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            data-testid="button-sell"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            SELL
          </Button>
        </div>
        
        {/* Order Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
          <Select value={type} onValueChange={(value: any) => setType(value)}>
            <SelectTrigger 
              className="w-full bg-navy-800 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-purple-primary"
              data-testid="select-order-type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
              <SelectItem value="stop">Stop</SelectItem>
              <SelectItem value="stop-limit">Stop Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-navy-800 border border-white/20 rounded-lg px-3 py-2 font-mono text-white focus:border-purple-primary"
              data-testid="input-quantity"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={type === 'market'}
              className="w-full bg-navy-800 border border-white/20 rounded-lg px-3 py-2 font-mono text-white focus:border-purple-primary disabled:opacity-50"
              data-testid="input-price"
            />
          </div>
        </div>
        
        {/* Risk Controls */}
        <div className="bg-navy-800/50 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-gray-300 mb-3">Risk Controls</h5>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Order Value:</span>
              <span className="font-mono" data-testid="text-order-value">
                ${orderValue.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Buying Power:</span>
              <span className="font-mono text-green-bullish" data-testid="text-buying-power">
                ${portfolio?.buyingPower || "0.00"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Max Position:</span>
              <span className="font-mono">$50,000.00</span>
            </div>
          </div>
        </div>
        
        {/* Submit Order */}
        <Button
          onClick={handleSubmitOrder}
          disabled={createOrder.isPending}
          className="w-full bg-gradient-to-r from-purple-primary to-purple-600 hover:from-purple-600 hover:to-purple-700 px-4 py-3 rounded-lg font-semibold transition-all duration-200 glow-purple"
          data-testid="button-submit-order"
        >
          <Send className="w-4 h-4 mr-2" />
          {createOrder.isPending ? 'Submitting...' : 'Submit Order'}
        </Button>
      </div>
    </div>
  );
}
