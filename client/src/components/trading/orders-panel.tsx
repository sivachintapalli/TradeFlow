import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  X
} from "lucide-react";

interface AlpacaOrder {
  id: string;
  symbol: string;
  qty: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  status: string;
  limit_price?: string;
  stop_price?: string;
  filled_qty: string;
  time_in_force: string;
  created_at: string;
  filled_at?: string;
  expired_at?: string;
  canceled_at?: string;
}

export default function OrdersPanel() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/alpaca/orders', statusFilter],
    queryFn: async (): Promise<AlpacaOrder[]> => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/alpaca/orders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/alpaca/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel order');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Cancelled",
        description: "Order has been successfully cancelled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/alpaca/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alpaca/account'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancel Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'filled':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'canceled':
      case 'cancelled':
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'filled':
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case 'canceled':
      case 'cancelled':
      case 'expired':
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case 'rejected':
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Orders
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-gray-400 hover:text-white"
              data-testid="button-refresh-orders"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to fetch orders. Please check your Alpaca credentials.
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
          <span>Orders</span>
          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-navy-800 border border-white/20 text-white text-xs" data-testid="select-order-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs text-gray-400">
              Live Data
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-gray-400 hover:text-white"
              data-testid="button-refresh-orders"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-navy-800 h-20 rounded-lg"></div>
            ))}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg mb-2">No orders</div>
            <div className="text-sm">Your order history will appear here</div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {orders?.map((order) => {
              const quantity = parseFloat(order.qty);
              const filledQuantity = parseFloat(order.filled_qty);
              const price = order.limit_price || order.stop_price;
              const canCancel = ['new', 'accepted', 'pending_new'].includes(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-navy-800 rounded-lg p-4 border border-white/10"
                  data-testid={`order-${order.id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      {order.side === 'buy' ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <div className="font-semibold text-white text-lg">
                          {order.symbol}
                        </div>
                        <div className="text-sm text-gray-400">
                          {order.side.toUpperCase()} {quantity} shares • {order.type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(order.status)}
                          <span>{order.status.toUpperCase()}</span>
                        </div>
                      </Badge>
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelOrderMutation.mutate(order.id)}
                          disabled={cancelOrderMutation.isPending}
                          className="text-gray-400 hover:text-red-400 h-8 w-8 p-0"
                          data-testid={`button-cancel-order-${order.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Price</div>
                      <div className="text-white font-semibold">
                        {price ? formatCurrency(price) : 'Market'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Filled</div>
                      <div className="text-white font-semibold">
                        {filledQuantity} / {quantity}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    <div>
                      <div className="text-gray-400">Time in Force</div>
                      <div className="text-white">{order.time_in_force.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Created</div>
                      <div className="text-white">{formatDateTime(order.created_at)}</div>
                    </div>
                  </div>

                  {(order.filled_at || order.canceled_at || order.expired_at) && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
                      {order.filled_at && `Filled: ${formatDateTime(order.filled_at)}`}
                      {order.canceled_at && `Cancelled: ${formatDateTime(order.canceled_at)}`}
                      {order.expired_at && `Expired: ${formatDateTime(order.expired_at)}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Data Source Attribution */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-500 text-center">
            Real-time order data from Alpaca Markets
          </div>
        </div>
      </CardContent>
    </Card>
  );
}