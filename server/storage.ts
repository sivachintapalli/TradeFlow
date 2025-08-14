import { 
  type User, 
  type InsertUser, 
  type Position, 
  type InsertPosition,
  type Order,
  type InsertOrder,
  type MarketData,
  type InsertMarketData,
  type Portfolio,
  type InsertPortfolio,
  type TechnicalIndicators,
  type InsertTechnicalIndicators
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Positions
  getAllPositions(): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, position: Partial<InsertPosition>): Promise<Position | undefined>;
  
  // Orders
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, filledAt?: Date): Promise<Order | undefined>;
  
  // Market Data
  getMarketData(symbol: string): Promise<MarketData | undefined>;
  updateMarketData(data: InsertMarketData): Promise<MarketData>;
  
  // Portfolio
  getPortfolio(): Promise<Portfolio | undefined>;
  updatePortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  
  // Technical Indicators
  getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators | undefined>;
  updateTechnicalIndicators(indicators: InsertTechnicalIndicators): Promise<TechnicalIndicators>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private positions: Map<string, Position>;
  private orders: Map<string, Order>;
  private marketData: Map<string, MarketData>;
  private portfolio: Portfolio | undefined;
  private technicalIndicators: Map<string, TechnicalIndicators>;

  constructor() {
    this.users = new Map();
    this.positions = new Map();
    this.orders = new Map();
    this.marketData = new Map();
    this.technicalIndicators = new Map();
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize with some sample data
    const portfolioData: Portfolio = {
      id: randomUUID(),
      totalValue: "127845.92",
      dayChange: "1234.56",
      dayChangePercent: "0.97",
      buyingPower: "125430.50",
      updatedAt: new Date(),
    };
    this.portfolio = portfolioData;

    // Sample positions
    const position1: Position = {
      id: randomUUID(),
      symbol: "AAPL",
      quantity: 100,
      avgPrice: "192.33",
      currentPrice: "196.89",
      pnl: "456.78",
      pnlPercent: "2.37",
      updatedAt: new Date(),
    };

    const position2: Position = {
      id: randomUUID(),
      symbol: "TSLA",
      quantity: 50,
      avgPrice: "412.89",
      currentPrice: "410.42",
      pnl: "-123.45",
      pnlPercent: "-0.60",
      updatedAt: new Date(),
    };

    this.positions.set(position1.id, position1);
    this.positions.set(position2.id, position2);

    // Sample market data
    const spyData: MarketData = {
      id: randomUUID(),
      symbol: "SPY",
      price: "542.18",
      change: "2.47",
      changePercent: "0.46",
      volume: 45200000,
      lastUpdate: new Date(),
    };

    const aaplData: MarketData = {
      id: randomUUID(),
      symbol: "AAPL",
      price: "196.89",
      change: "2.47",
      changePercent: "1.27",
      volume: 45200000,
      lastUpdate: new Date(),
    };

    this.marketData.set("SPY", spyData);
    this.marketData.set("AAPL", aaplData);

    // Sample technical indicators
    const aaplIndicators: TechnicalIndicators = {
      id: randomUUID(),
      symbol: "AAPL",
      rsi: "67.42",
      macd: "1.23",
      macdSignal: "0.89",
      macdHistogram: "0.34",
      bollingerUpper: "201.45",
      bollingerMiddle: "196.89",
      bollingerLower: "192.33",
      volume: 45200000,
      avgVolume: 52100000,
      updatedAt: new Date(),
    };

    this.technicalIndicators.set("AAPL", aaplIndicators);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const id = randomUUID();
    const position: Position = { 
      ...insertPosition, 
      id, 
      updatedAt: new Date() 
    };
    this.positions.set(id, position);
    return position;
  }

  async updatePosition(id: string, updateData: Partial<InsertPosition>): Promise<Position | undefined> {
    const position = this.positions.get(id);
    if (!position) return undefined;
    
    const updatedPosition: Position = { 
      ...position, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.positions.set(id, updatedPosition);
    return updatedPosition;
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder,
      id,
      price: insertOrder.price || null,
      stopPrice: insertOrder.stopPrice || null,
      status: "pending",
      createdAt: new Date(),
      filledAt: null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: string, status: string, filledAt?: Date): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder: Order = { 
      ...order, 
      status, 
      filledAt: filledAt || null 
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    return this.marketData.get(symbol);
  }

  async updateMarketData(data: InsertMarketData): Promise<MarketData> {
    const existing = this.marketData.get(data.symbol);
    const marketData: MarketData = {
      id: existing?.id || randomUUID(),
      ...data,
      lastUpdate: new Date(),
    };
    this.marketData.set(data.symbol, marketData);
    return marketData;
  }

  async getPortfolio(): Promise<Portfolio | undefined> {
    return this.portfolio;
  }

  async updatePortfolio(portfolioData: InsertPortfolio): Promise<Portfolio> {
    const portfolio: Portfolio = {
      id: this.portfolio?.id || randomUUID(),
      ...portfolioData,
      updatedAt: new Date(),
    };
    this.portfolio = portfolio;
    return portfolio;
  }

  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators | undefined> {
    return this.technicalIndicators.get(symbol);
  }

  async updateTechnicalIndicators(indicators: InsertTechnicalIndicators): Promise<TechnicalIndicators> {
    const existing = this.technicalIndicators.get(indicators.symbol);
    const data: TechnicalIndicators = {
      id: existing?.id || randomUUID(),
      ...indicators,
      updatedAt: new Date(),
    };
    this.technicalIndicators.set(indicators.symbol, data);
    return data;
  }
}

export const storage = new MemStorage();
