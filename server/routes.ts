import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertMarketDataSchema, insertTechnicalIndicatorsSchema, insertHistoricalDataSchema } from "@shared/schema";
import { polygonService } from "./polygon";
import { alpacaService } from "./alpaca";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Portfolio endpoints
  app.get("/api/portfolio", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio();
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Positions endpoints
  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getAllPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Simulate order processing
      setTimeout(async () => {
        await storage.updateOrderStatus(order.id, "filled", new Date());
      }, 2000);
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid order data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  // Market data endpoints
  app.get("/api/market-data/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const marketData = await storage.getMarketData(symbol.toUpperCase());
      
      if (!marketData) {
        res.status(404).json({ message: "Market data not found" });
        return;
      }
      
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  app.post("/api/market-data", async (req, res) => {
    try {
      const marketData = insertMarketDataSchema.parse(req.body);
      const result = await storage.updateMarketData(marketData);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid market data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update market data" });
      }
    }
  });

  // Technical indicators endpoints
  app.get("/api/technical-indicators/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const indicators = await storage.getTechnicalIndicators(symbol.toUpperCase());
      
      if (!indicators) {
        res.status(404).json({ message: "Technical indicators not found" });
        return;
      }
      
      res.json(indicators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch technical indicators" });
    }
  });

  app.post("/api/technical-indicators", async (req, res) => {
    try {
      const indicators = insertTechnicalIndicatorsSchema.parse(req.body);
      const result = await storage.updateTechnicalIndicators(indicators);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid technical indicators", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update technical indicators" });
      }
    }
  });

  // Historical data endpoints
  app.get("/api/historical-data/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe = '1D', limit = '100', offset = '0' } = req.query;
      
      const historicalData = await storage.getHistoricalData(
        symbol.toUpperCase(), 
        timeframe as string, 
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json(historicalData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch historical data" });
    }
  });

  app.post("/api/historical-data", async (req, res) => {
    try {
      const data = insertHistoricalDataSchema.parse(req.body);
      const result = await storage.createHistoricalData(data);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid historical data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create historical data" });
      }
    }
  });

  // Polygon API endpoints for data synchronization
  app.post("/api/sync-ticker/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const upperSymbol = symbol.toUpperCase();
      
      // Check if sync is needed
      const needsSync = await polygonService.needsDataSync(upperSymbol);
      if (!needsSync) {
        return res.json({ message: "Data is up to date", synced: false });
      }
      
      // Perform sync
      await polygonService.syncTickerData(upperSymbol);
      await polygonService.updateMarketData(upperSymbol);
      
      res.json({ message: "Data synchronized", synced: true });
    } catch (error: any) {
      console.error('Sync ticker error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to sync ticker data",
        error: error.name 
      });
    }
  });

  app.post("/api/download-ticker", async (req, res) => {
    try {
      const { symbol, period } = req.body;
      
      if (!symbol || !period) {
        return res.status(400).json({ message: "Symbol and period are required" });
      }
      
      const upperSymbol = symbol.toUpperCase();
      const validPeriods = ['1Y', '5Y', '10Y', 'MAX'];
      
      if (!validPeriods.includes(period)) {
        return res.status(400).json({ message: "Invalid period. Use 1Y, 5Y, 10Y, or MAX" });
      }
      
      // Set up SSE for progress updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      let progress = 0;
      const sendProgress = (prog: number, year?: number) => {
        progress = prog;
        const data = JSON.stringify({ progress: Math.round(prog), year });
        res.write(`data: ${data}\n\n`);
      };
      
      try {
        await polygonService.downloadHistoricalData(upperSymbol, period, sendProgress);
        await polygonService.updateMarketData(upperSymbol);
        
        res.write(`data: ${JSON.stringify({ progress: 100, completed: true })}\n\n`);
        res.end();
      } catch (error: any) {
        const errorData = JSON.stringify({ 
          error: true, 
          message: error.message || "Download failed",
          progress 
        });
        res.write(`data: ${errorData}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error('Download ticker error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to download ticker data" 
      });
    }
  });

  app.get("/api/ticker-status/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const upperSymbol = symbol.toUpperCase();
      
      const latestTimestamp = await polygonService.getLatestDataTimestamp(upperSymbol);
      const needsSync = await polygonService.needsDataSync(upperSymbol);
      const isMarketOpen = polygonService.isMarketOpen();
      const mostRecentClose = polygonService.getMostRecentMarketClose();
      
      res.json({
        symbol: upperSymbol,
        hasData: !!latestTimestamp,
        latestTimestamp,
        needsSync,
        isMarketOpen,
        mostRecentClose
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get ticker status" });
    }
  });

  // Alpaca Trading API endpoints
  app.get("/api/alpaca/account", async (req, res) => {
    try {
      const account = await alpacaService.getAccount();
      res.json(account);
    } catch (error: any) {
      console.error('Alpaca account error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch account info" });
    }
  });

  app.get("/api/alpaca/positions", async (req, res) => {
    try {
      const positions = await alpacaService.getPositions();
      res.json(positions);
    } catch (error: any) {
      console.error('Alpaca positions error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch positions" });
    }
  });

  app.get("/api/alpaca/orders", async (req, res) => {
    try {
      const { status, limit } = req.query;
      const orders = await alpacaService.getOrders(
        status as string, 
        limit ? parseInt(limit as string) : 100
      );
      res.json(orders);
    } catch (error: any) {
      console.error('Alpaca orders error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
    }
  });

  app.post("/api/alpaca/orders", async (req, res) => {
    try {
      const { symbol, qty, side, type, time_in_force, limit_price, stop_price, extended_hours } = req.body;
      
      if (!symbol || !qty || !side || !type) {
        return res.status(400).json({ message: "Missing required fields: symbol, qty, side, type" });
      }

      const order = await alpacaService.submitOrder({
        symbol,
        qty: parseInt(qty),
        side,
        type,
        time_in_force: time_in_force || 'day',
        limit_price: limit_price ? parseFloat(limit_price) : undefined,
        stop_price: stop_price ? parseFloat(stop_price) : undefined,
        extended_hours: extended_hours || false,
      });

      res.json(order);
    } catch (error: any) {
      console.error('Alpaca order submission error:', error);
      res.status(500).json({ message: error.message || "Failed to submit order" });
    }
  });

  app.delete("/api/alpaca/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      await alpacaService.cancelOrder(orderId);
      res.json({ message: "Order cancelled successfully" });
    } catch (error: any) {
      console.error('Alpaca cancel order error:', error);
      res.status(500).json({ message: error.message || "Failed to cancel order" });
    }
  });

  app.delete("/api/alpaca/orders", async (req, res) => {
    try {
      await alpacaService.cancelAllOrders();
      res.json({ message: "All orders cancelled successfully" });
    } catch (error: any) {
      console.error('Alpaca cancel all orders error:', error);
      res.status(500).json({ message: error.message || "Failed to cancel all orders" });
    }
  });

  app.get("/api/alpaca/market-status", async (req, res) => {
    try {
      const isOpen = await alpacaService.isMarketOpen();
      res.json({ isOpen });
    } catch (error: any) {
      console.error('Alpaca market status error:', error);
      res.status(500).json({ message: error.message || "Failed to check market status" });
    }
  });

  app.post("/api/alpaca/sync", async (req, res) => {
    try {
      await Promise.all([
        alpacaService.syncPositions(),
        alpacaService.syncOrders()
      ]);
      res.json({ message: "Data synchronized with Alpaca successfully" });
    } catch (error: any) {
      console.error('Alpaca sync error:', error);
      res.status(500).json({ message: error.message || "Failed to sync with Alpaca" });
    }
  });

  // Emergency stop endpoint - now uses Alpaca
  app.post("/api/emergency-stop", async (req, res) => {
    try {
      await alpacaService.cancelAllOrders();
      res.json({ 
        message: "Emergency stop executed - all orders cancelled via Alpaca" 
      });
    } catch (error: any) {
      console.error('Emergency stop error:', error);
      res.status(500).json({ message: error.message || "Failed to execute emergency stop" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
