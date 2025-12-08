-- Initialize ScenarioForge database
-- This script runs when the PostgreSQL container is first created

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Graphs table
CREATE TABLE IF NOT EXISTS graphs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nodes table
CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id UUID NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position JSONB DEFAULT '{"x": 0, "y": 0}',
    schema JSONB DEFAULT '{}',
    data JSONB DEFAULT '{}',
    input_ports JSONB DEFAULT '[]',
    output_ports JSONB DEFAULT '[]',
    computed_output JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nodes_graph_id ON nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);

-- Edges table
CREATE TABLE IF NOT EXISTS edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id UUID NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    source_port_id VARCHAR(255) NOT NULL,
    target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_port_id VARCHAR(255) NOT NULL,
    label VARCHAR(255),
    animated BOOLEAN DEFAULT FALSE,
    style JSONB DEFAULT '{}',
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edges_graph_id ON edges(graph_id);
CREATE INDEX IF NOT EXISTS idx_edges_source_node ON edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target_node ON edges(target_node_id);

-- Simulation results table (TimescaleDB hypertable for time-series)
CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID DEFAULT uuid_generate_v4(),
    simulation_id UUID NOT NULL,
    graph_id UUID NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    iteration INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outputs JSONB NOT NULL,
    node_values JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    PRIMARY KEY (id, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('simulation_results', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_simulation_results_sim_id ON simulation_results(simulation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_results_graph_id ON simulation_results(graph_id, timestamp DESC);

-- Simulation summaries table
CREATE TABLE IF NOT EXISTS simulation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id UUID UNIQUE NOT NULL,
    graph_id UUID NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    iterations_completed INTEGER DEFAULT 0,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    error TEXT,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_summaries_graph_id ON simulation_summaries(graph_id);
CREATE INDEX IF NOT EXISTS idx_simulation_summaries_status ON simulation_summaries(status);

-- Optimization runs table
CREATE TABLE IF NOT EXISTS optimization_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    optimization_id UUID UNIQUE NOT NULL,
    graph_id UUID NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    iterations_completed INTEGER DEFAULT 0,
    best_params JSONB DEFAULT '{}',
    best_objective DOUBLE PRECISION,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    error TEXT,
    history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimization_runs_graph_id ON optimization_runs(graph_id);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_status ON optimization_runs(status);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_graphs_updated_at
    BEFORE UPDATE ON graphs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edges_updated_at
    BEFORE UPDATE ON edges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulation_summaries_updated_at
    BEFORE UPDATE ON simulation_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimization_runs_updated_at
    BEFORE UPDATE ON optimization_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO scenarioforge;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO scenarioforge;
