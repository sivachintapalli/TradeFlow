import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  quantity: integer("quantity").notNull(),
  avgPrice: decimal("avg_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  pnl: decimal("pnl", { precision: 10, scale: 2 }).notNull(),
  pnlPercent: decimal("pnl_percent", { precision: 5, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' or 'sell'
  type: text("type").notNull(), // 'market', 'limit', 'stop', 'stop-limit'
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  stopPrice: decimal("stop_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"), // 'pending', 'filled', 'cancelled', 'rejected'
  timeInForce: text("time_in_force").default("day"), // 'day', 'gtc', 'ioc', 'fok'
  alpacaOrderId: text("alpaca_order_id").unique(),
  filledQuantity: integer("filled_quantity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  filledAt: timestamp("filled_at"),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  change: decimal("change", { precision: 10, scale: 2 }).notNull(),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull(),
  volume: integer("volume").notNull(),
  lastUpdate: timestamp("last_update").defaultNow(),
});

export const portfolio = pgTable("portfolio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  dayChange: decimal("day_change", { precision: 10, scale: 2 }).notNull(),
  dayChangePercent: decimal("day_change_percent", { precision: 5, scale: 2 }).notNull(),
  buyingPower: decimal("buying_power", { precision: 12, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const technicalIndicators = pgTable("technical_indicators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  rsi: decimal("rsi", { precision: 5, scale: 2 }),
  macd: decimal("macd", { precision: 8, scale: 4 }),
  macdSignal: decimal("macd_signal", { precision: 8, scale: 4 }),
  macdHistogram: decimal("macd_histogram", { precision: 8, scale: 4 }),
  bollingerUpper: decimal("bollinger_upper", { precision: 10, scale: 2 }),
  bollingerMiddle: decimal("bollinger_middle", { precision: 10, scale: 2 }),
  bollingerLower: decimal("bollinger_lower", { precision: 10, scale: 2 }),
  volume: integer("volume"),
  avgVolume: integer("avg_volume"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const historicalData = pgTable("historical_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 10, scale: 2 }).notNull(),
  high: decimal("high", { precision: 10, scale: 2 }).notNull(),
  low: decimal("low", { precision: 10, scale: 2 }).notNull(),
  close: decimal("close", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume").notNull(),
  timeframe: text("timeframe").notNull(), // '1M', '5M', '15M', '1H', '1D'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate records
  symbolTimestampTimeframe: unique().on(table.symbol, table.timestamp, table.timeframe),
}));

// Download jobs tracking table
export const downloadJobs = pgTable("download_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  period: text("period").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress, completed, failed
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  expectedRecords: integer("expected_records").notNull().default(0),
  currentRecords: integer("current_records").notNull().default(0),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  filledAt: true,
}).extend({
  price: z.string().optional(),
  stopPrice: z.string().optional(),
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  lastUpdate: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolio).omit({
  id: true,
  updatedAt: true,
});

export const insertTechnicalIndicatorsSchema = createInsertSchema(technicalIndicators).omit({
  id: true,
  updatedAt: true,
});

export const insertHistoricalDataSchema = createInsertSchema(historicalData).omit({
  id: true,
  createdAt: true,
});

export const insertDownloadJobSchema = createInsertSchema(downloadJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolio.$inferSelect;
export type InsertTechnicalIndicators = z.infer<typeof insertTechnicalIndicatorsSchema>;
export type TechnicalIndicators = typeof technicalIndicators.$inferSelect;
export type InsertHistoricalData = z.infer<typeof insertHistoricalDataSchema>;
export type HistoricalData = typeof historicalData.$inferSelect;
export type InsertDownloadJob = z.infer<typeof insertDownloadJobSchema>;
export type DownloadJob = typeof downloadJobs.$inferSelect;
