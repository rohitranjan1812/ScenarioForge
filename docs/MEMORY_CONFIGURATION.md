# Memory and Resource Configuration Guide

## Overview

ScenarioForge has been optimized to handle large-scale simulations efficiently while preventing out-of-memory errors. This guide explains the configuration options available for tuning resource usage.

## Key Resilience Features

### 1. **Streaming Aggregation**
- Simulations use reservoir sampling to maintain statistical accuracy while limiting memory usage
- Instead of storing all iteration results, we maintain a representative sample (max 10,000 values)
- Statistical metrics are calculated on-the-fly during simulation execution

### 2. **Iteration Limits**
- Default maximum: 1,000,000 iterations per simulation
- Configurable via `MAX_SIMULATION_ITERATIONS` environment variable
- Automatically caps user requests that exceed the limit

### 3. **Execution Timeouts**
- Default maximum execution time: 5 minutes (300,000ms)
- Configurable via `MAX_SIMULATION_TIME` environment variable
- Simulations are gracefully terminated if they exceed the time limit

### 4. **Database Connection Pooling**
- Connection pool limits prevent database resource exhaustion
- Configurable pool size, idle timeout, and connection timeout
- Statement timeout prevents long-running queries from blocking resources

### 5. **Request Size and Timeout Limits**
- Default request size limit: 50MB (configurable via `MAX_REQUEST_SIZE`)
- Default request timeout: 2 minutes (configurable via `REQUEST_TIMEOUT`)
- Prevents unbounded request processing

## Configuration Options

### Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```bash
cp apps/api/.env.example apps/api/.env
```

#### Database Pool Configuration

```bash
# Maximum number of connections in the pool (default: 20)
DB_POOL_MAX=20

# Minimum number of connections in the pool (default: 2)
DB_POOL_MIN=2

# Connection idle timeout in milliseconds (default: 30000)
DB_IDLE_TIMEOUT=30000

# Connection timeout in milliseconds (default: 10000)
DB_CONNECTION_TIMEOUT=10000

# Statement execution timeout in milliseconds (default: 60000)
DB_STATEMENT_TIMEOUT=60000
```

#### Simulation Limits

```bash
# Maximum iterations per simulation (default: 1000000)
MAX_SIMULATION_ITERATIONS=1000000

# Maximum execution time in milliseconds (default: 300000 = 5 minutes)
MAX_SIMULATION_TIME=300000
```

#### Request Limits

```bash
# Maximum request body size (default: 50mb)
MAX_REQUEST_SIZE=50mb

# Request timeout in milliseconds (default: 120000 = 2 minutes)
REQUEST_TIMEOUT=120000
```

## Production Deployment Recommendations

### Small to Medium Scale (< 100k iterations)
```bash
MAX_SIMULATION_ITERATIONS=100000
MAX_SIMULATION_TIME=120000  # 2 minutes
DB_POOL_MAX=10
DB_POOL_MIN=2
REQUEST_TIMEOUT=180000      # 3 minutes
```

### Large Scale (100k - 1M iterations)
```bash
MAX_SIMULATION_ITERATIONS=1000000
MAX_SIMULATION_TIME=600000  # 10 minutes
DB_POOL_MAX=20
DB_POOL_MIN=5
REQUEST_TIMEOUT=660000      # 11 minutes
```

### Memory-Constrained Environments
```bash
MAX_SIMULATION_ITERATIONS=50000
MAX_SIMULATION_TIME=60000   # 1 minute
DB_POOL_MAX=5
DB_POOL_MIN=1
MAX_REQUEST_SIZE=10mb
```

## Memory Usage Monitoring

### Health Check Endpoint

The `/health` endpoint provides real-time memory usage metrics:

```bash
curl http://localhost:3000/health
```

Response includes:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "memory": {
    "rss": 125,        // Resident set size in MB
    "heapTotal": 50,   // Total heap size in MB
    "heapUsed": 35,    // Used heap size in MB
    "external": 2      // External memory in MB
  },
  "uptime": 3600
}
```

### Monitoring Best Practices

1. **Set up alerts** for high memory usage (> 80% of available)
2. **Monitor heap growth** trends over time
3. **Track simulation execution times** to identify performance degradation
4. **Log memory warnings** when approaching limits

## Troubleshooting

### Out of Memory Errors

If you still encounter OOM errors:

1. **Reduce iteration count**: Lower `MAX_SIMULATION_ITERATIONS`
2. **Decrease pool size**: Lower `DB_POOL_MAX` to reduce overhead
3. **Enable garbage collection**: Run with `--expose-gc` flag and set `ENABLE_GC=true`
4. **Increase Node.js heap**: Use `--max-old-space-size=4096` flag
5. **Split large simulations**: Run multiple smaller simulations instead of one large one

### Performance Optimization

For better performance:

1. **Increase pool size** if database is not the bottleneck
2. **Use connection caching** with Redis (optional)
3. **Optimize graph complexity** - fewer nodes and edges = faster execution
4. **Batch operations** when possible
5. **Use deterministic execution** (`/simulations/execute`) for single runs instead of Monte Carlo

## Node.js Flags for Production

Recommended Node.js startup flags:

```bash
# Standard deployment
node --max-old-space-size=2048 dist/index.js

# Memory-constrained environment
node --max-old-space-size=1024 --optimize-for-size dist/index.js

# Debug memory issues
node --max-old-space-size=2048 --expose-gc --trace-gc dist/index.js
```

## Docker Configuration

When running in Docker, set appropriate memory limits:

```yaml
services:
  api:
    image: scenarioforge-api
    environment:
      - MAX_SIMULATION_ITERATIONS=500000
      - MAX_SIMULATION_TIME=300000
      - DB_POOL_MAX=15
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

## Advanced: Custom Memory Management

For specialized use cases, you can implement custom memory management:

1. **Implement result streaming**: Stream results to a file or external storage
2. **Use worker threads**: Distribute simulations across multiple threads
3. **Implement pagination**: Load and process data in chunks
4. **Custom aggregation**: Implement domain-specific aggregation logic

## Support

For issues or questions:
- Check the health endpoint for memory metrics
- Review application logs for warnings
- Consult this guide for configuration tuning
- Open an issue on GitHub with memory usage details
