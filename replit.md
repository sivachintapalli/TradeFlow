# Overview

A professional algorithmic trading dashboard built with React, Express, and TypeScript. The application features a dual-mode interface supporting both historical analysis and real-time trading operations. The platform provides comprehensive trading functionality including portfolio management, order execution, market data visualization, and technical analysis tools.

# User Preferences

Preferred communication style: Simple, everyday language.
Data integrity: Never use mock data - only authentic market data from real sources.

# System Architecture

## Frontend Architecture

- **Framework**: React 18 with TypeScript and Vite for development
- **Styling**: Tailwind CSS with custom design system featuring glass morphism effects
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Design System**: Professional financial aesthetics with navy/charcoal backgrounds and purple accent colors

## Backend Architecture

- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ES modules
- **Storage Layer**: PostgreSQL database with Drizzle ORM (DatabaseStorage implementation)
- **Database**: Neon PostgreSQL serverless database with WebSocket connections
- **API Design**: RESTful endpoints for portfolio, positions, orders, and market data
- **Development**: Hot-reload with Vite integration in development mode

## Data Management

- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions (migrated from in-memory storage)
- **Tables**: Users, positions, orders, market data, portfolio, technical indicators, and historical data
- **Query Layer**: Type-safe database operations with Drizzle and Neon serverless PostgreSQL
- **Data Validation**: Zod schemas for runtime type checking and API validation
- **Migration Status**: Database schema successfully pushed on 2025-01-14, all tables created with proper constraints

## Component Architecture

- **Dual-Mode Interface**: Tab-based navigation between Historical Analysis and Real-Time Trading
- **Historical Mode**: TradingView-style chart interface with technical indicators
- **Real-Time Mode**: Bloomberg Terminal-style layout with order entry, live charts, and portfolio panels
- **Responsive Design**: Mobile-first approach with glass morphism design patterns

## Security & Validation

- **Type Safety**: End-to-end TypeScript with shared schema definitions
- **Input Validation**: Zod schemas for all API inputs and form validation
- **Error Handling**: Centralized error handling with toast notifications

# External Dependencies

## Core Technologies

- **React Query**: Server state synchronization and caching
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL
- **Neon Database**: Serverless PostgreSQL database service

## Development Tools

- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Production bundling
- **PostCSS**: CSS processing with Autoprefixer

## UI Enhancement Libraries

- **Lucide React**: Icon library
- **Date-fns**: Date manipulation utilities
- **Embla Carousel**: Carousel component
- **Class Variance Authority**: Component variant management
- **CLSX & Tailwind Merge**: Conditional styling utilities

## Financial Data Integration

- **Polygon.io API**: Integrated for authentic real-time and historical market data
- **Data Integrity Policy**: System exclusively uses real market data - no mock, placeholder, or synthetic data
- **Historical Data**: Downloaded on-demand from Polygon API with progress tracking
- **Market Data Sync**: Automatic synchronization of existing tickers with latest market data
- **Error Handling**: Clear messaging when authentic data unavailable, never falls back to mock data