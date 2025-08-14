import { db } from "./db";
import { orders, positions } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at?: string;
  expired_at?: string;
  canceled_at?: string;
  failed_at?: string;
  replaced_at?: string;
  asset_id: string;
  symbol: string;
  qty: string;
  filled_qty: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  side: 'buy' | 'sell';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok' | 'opg' | 'cls';
  limit_price?: string;
  stop_price?: string;
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'rejected' | 'suspended' | 'calculated';
  extended_hours: boolean;
  legs?: any[];
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
}

export class AlpacaService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    if (!process.env.ALPACA_API_KEY) {
      throw new Error('ALPACA_API_KEY environment variable is required');
    }
    if (!process.env.ALPACA_API_SECRET) {
      throw new Error('ALPACA_API_SECRET environment variable is required');
    }
    if (!process.env.ALPACA_BASE_URL) {
      throw new Error('ALPACA_BASE_URL environment variable is required');
    }

    this.apiKey = process.env.ALPACA_API_KEY;
    this.secretKey = process.env.ALPACA_API_SECRET;
    this.baseUrl = process.env.ALPACA_BASE_URL;
  }

  /**
   * Make authenticated request to Alpaca API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Alpaca API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Alpaca API request failed:', error);
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<AlpacaAccount> {
    return this.makeRequest('/v2/account');
  }

  /**
   * Get all positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    return this.makeRequest('/v2/positions');
  }

  /**
   * Get orders with optional filter
   */
  async getOrders(status?: string, limit: number = 100): Promise<AlpacaOrder[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('direction', 'desc');

    return this.makeRequest(`/v2/orders?${params.toString()}`);
  }

  /**
   * Submit a new order
   */
  async submitOrder(orderData: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
    extended_hours?: boolean;
  }): Promise<AlpacaOrder> {
    const order = await this.makeRequest('/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...orderData,
        qty: orderData.qty.toString(),
        limit_price: orderData.limit_price?.toString(),
        stop_price: orderData.stop_price?.toString(),
      }),
    });

    // Save order to database
    await this.saveOrderToDatabase(order);
    return order;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    await this.makeRequest(`/v2/orders/${orderId}`, {
      method: 'DELETE',
    });

    // Update order status in database
    await db.update(orders)
      .set({ status: 'cancelled' })
      .where(eq(orders.alpacaOrderId, orderId));
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(): Promise<void> {
    await this.makeRequest('/v2/orders', {
      method: 'DELETE',
    });

    // Update all pending orders in database
    await db.update(orders)
      .set({ status: 'cancelled' })
      .where(eq(orders.status, 'pending'));
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<AlpacaOrder> {
    return this.makeRequest(`/v2/orders/${orderId}`);
  }

  /**
   * Sync positions from Alpaca to database
   */
  async syncPositions(): Promise<void> {
    try {
      const alpacaPositions = await this.getPositions();
      
      // Clear existing positions
      await db.delete(positions);

      // Insert current positions
      if (alpacaPositions.length > 0) {
        const positionsToInsert = alpacaPositions.map(pos => ({
          symbol: pos.symbol,
          quantity: parseInt(pos.qty),
          avgPrice: pos.avg_entry_price,
          currentPrice: pos.current_price,
          pnl: pos.unrealized_pl,
          pnlPercent: pos.unrealized_plpc,
        }));

        await db.insert(positions).values(positionsToInsert);
      }

      console.log(`Synced ${alpacaPositions.length} positions from Alpaca`);
    } catch (error) {
      console.error('Error syncing positions:', error);
      throw error;
    }
  }

  /**
   * Sync orders from Alpaca to database
   */
  async syncOrders(): Promise<void> {
    try {
      const alpacaOrders = await this.getOrders();
      
      for (const order of alpacaOrders) {
        await this.saveOrderToDatabase(order);
      }

      console.log(`Synced ${alpacaOrders.length} orders from Alpaca`);
    } catch (error) {
      console.error('Error syncing orders:', error);
      throw error;
    }
  }

  /**
   * Save Alpaca order to database
   */
  private async saveOrderToDatabase(alpacaOrder: AlpacaOrder): Promise<void> {
    try {
      await db.insert(orders).values({
        symbol: alpacaOrder.symbol,
        type: alpacaOrder.type,
        side: alpacaOrder.side,
        quantity: parseInt(alpacaOrder.qty),
        price: alpacaOrder.limit_price || alpacaOrder.stop_price || "0",
        status: this.mapAlpacaStatus(alpacaOrder.status),
        timeInForce: alpacaOrder.time_in_force,
        alpacaOrderId: alpacaOrder.id,
        createdAt: new Date(alpacaOrder.created_at),
      }).onConflictDoUpdate({
        target: orders.alpacaOrderId,
        set: {
          status: this.mapAlpacaStatus(alpacaOrder.status),
          filledQuantity: parseInt(alpacaOrder.filled_qty),
        }
      });
    } catch (error) {
      console.error('Error saving order to database:', error);
      throw error;
    }
  }

  /**
   * Map Alpaca order status to our database status
   */
  private mapAlpacaStatus(alpacaStatus: string): string {
    switch (alpacaStatus) {
      case 'new':
      case 'accepted':
      case 'pending_new':
        return 'pending';
      case 'filled':
        return 'filled';
      case 'canceled':
      case 'expired':
        return 'cancelled';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  /**
   * Check if market is open according to Alpaca
   */
  async isMarketOpen(): Promise<boolean> {
    try {
      const clock = await this.makeRequest('/v2/clock');
      return clock.is_open;
    } catch (error) {
      console.error('Error checking market status:', error);
      return false;
    }
  }

  /**
   * Get market calendar
   */
  async getCalendar(start?: string, end?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    
    return this.makeRequest(`/v2/calendar?${params.toString()}`);
  }
}

export const alpacaService = new AlpacaService();