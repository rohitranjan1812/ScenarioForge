// Database connection and initialization
import pg from 'pg';

const { Pool } = pg;

// Database connection pool
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      database: process.env.DB_NAME ?? 'scenarioforge',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
    });
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  const db = getPool();
  
  // Create tables if they don't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS graphs (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      nodes JSONB DEFAULT '[]',
      edges JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_graphs_name ON graphs(name);
    CREATE INDEX IF NOT EXISTS idx_graphs_created_at ON graphs(created_at);
  `);
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS simulations (
      id UUID PRIMARY KEY,
      graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      config JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      progress FLOAT DEFAULT 0,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_simulations_graph_id ON simulations(graph_id);
    CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations(status);
  `);
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS simulation_results (
      id UUID PRIMARY KEY,
      simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
      iteration INTEGER NOT NULL,
      node_id UUID NOT NULL,
      output_key VARCHAR(100) NOT NULL,
      value DOUBLE PRECISION NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_results_simulation_id ON simulation_results(simulation_id);
    CREATE INDEX IF NOT EXISTS idx_results_node_id ON simulation_results(node_id);
  `);
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS optimizations (
      id UUID PRIMARY KEY,
      graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
      config JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      progress FLOAT DEFAULT 0,
      best_result JSONB,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_optimizations_graph_id ON optimizations(graph_id);
    CREATE INDEX IF NOT EXISTS idx_optimizations_status ON optimizations(status);
  `);
  
  console.log('✅ Database initialized');
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Helper to run queries
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = getPool();
  const result = await db.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
