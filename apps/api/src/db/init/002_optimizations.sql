-- Memory and Performance Optimizations for ScenarioForge
-- Run this script after initial setup to add resilience features

-- Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_graph_id_type ON nodes(graph_id, type);
CREATE INDEX IF NOT EXISTS idx_simulation_results_iteration ON simulation_results(simulation_id, iteration);

-- Add data retention policy for simulation results (optional)
-- Uncomment to automatically delete results older than 30 days
-- SELECT add_retention_policy('simulation_results', INTERVAL '30 days');

-- Add compression policy for old simulation results to save space
-- Compress data older than 7 days
SELECT add_compression_policy('simulation_results', INTERVAL '7 days', if_not_exists => TRUE);

-- Add statistics for query planner optimization
ANALYZE graphs;
ANALYZE nodes;
ANALYZE edges;
ANALYZE simulation_results;
ANALYZE simulation_summaries;

-- Add constraint to limit iterations (optional safety check)
ALTER TABLE simulation_summaries 
  ADD CONSTRAINT check_iteration_limit 
  CHECK (iterations_completed >= 0 AND iterations_completed <= 10000000);

-- Create materialized view for frequently accessed simulation metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS simulation_metrics_summary AS
SELECT 
  s.id,
  s.graph_id,
  s.simulation_id,
  s.status,
  s.iterations_completed,
  s.start_time,
  s.end_time,
  EXTRACT(EPOCH FROM (s.end_time - s.start_time)) as execution_seconds,
  s.metrics,
  g.name as graph_name,
  COUNT(DISTINCT r.id) as result_count
FROM simulation_summaries s
JOIN graphs g ON s.graph_id = g.id
LEFT JOIN simulation_results r ON s.simulation_id = r.simulation_id
WHERE s.status = 'completed'
GROUP BY s.id, s.graph_id, s.simulation_id, s.status, s.iterations_completed, 
         s.start_time, s.end_time, s.metrics, g.name;

CREATE INDEX IF NOT EXISTS idx_sim_metrics_summary_graph 
  ON simulation_metrics_summary(graph_id);

-- Function to clean up old failed simulations
CREATE OR REPLACE FUNCTION cleanup_failed_simulations(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM simulation_summaries 
  WHERE status = 'failed' 
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule regular cleanup (requires pg_cron extension - optional)
-- SELECT cron.schedule('cleanup-failed-sims', '0 2 * * *', 
--   'SELECT cleanup_failed_simulations(7)');

-- Add memory-efficient pagination helper
CREATE OR REPLACE FUNCTION get_simulation_results_page(
  p_simulation_id UUID,
  p_page_size INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  iteration INTEGER,
  timestamp TIMESTAMPTZ,
  outputs JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.iteration, r.timestamp, r.outputs
  FROM simulation_results r
  WHERE r.simulation_id = p_simulation_id
  ORDER BY r.iteration
  LIMIT p_page_size
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Add function to get aggregated metrics without loading all data
CREATE OR REPLACE FUNCTION get_simulation_aggregated_metrics(
  p_simulation_id UUID
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_object_agg(
    metric_key,
    jsonb_build_object(
      'count', count,
      'min', min_value,
      'max', max_value,
      'avg', avg_value,
      'stddev', stddev_value
    )
  ) INTO result
  FROM (
    SELECT 
      jsonb_object_keys(outputs) as metric_key,
      COUNT(*) as count,
      MIN((outputs->>jsonb_object_keys(outputs))::numeric) as min_value,
      MAX((outputs->>jsonb_object_keys(outputs))::numeric) as max_value,
      AVG((outputs->>jsonb_object_keys(outputs))::numeric) as avg_value,
      STDDEV((outputs->>jsonb_object_keys(outputs))::numeric) as stddev_value
    FROM simulation_results
    WHERE simulation_id = p_simulation_id
    GROUP BY metric_key
  ) metrics;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_failed_simulations(INTEGER) TO scenarioforge;
GRANT EXECUTE ON FUNCTION get_simulation_results_page(UUID, INTEGER, INTEGER) TO scenarioforge;
GRANT EXECUTE ON FUNCTION get_simulation_aggregated_metrics(UUID) TO scenarioforge;

-- Log optimization completion
DO $$
BEGIN
  RAISE NOTICE 'Memory and performance optimizations applied successfully';
  RAISE NOTICE 'Compression policy enabled for simulation_results';
  RAISE NOTICE 'Helper functions created for efficient data access';
END $$;
