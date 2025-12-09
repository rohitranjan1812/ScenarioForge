# Production Deployment Guide

This guide covers best practices for deploying ScenarioForge in production environments with optimal memory and performance configurations.

## Prerequisites

- Node.js 18+ (20 LTS recommended)
- PostgreSQL 15+ with TimescaleDB extension
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (recommended)
- At least 2GB RAM available (4GB+ recommended for large simulations)

## Quick Start with Docker

### 1. Clone and Configure

```bash
git clone <repository-url>
cd ScenarioForge
cp apps/api/.env.example apps/api/.env
```

### 2. Edit Environment Variables

Edit `apps/api/.env` for your environment:

```bash
# Production settings
NODE_ENV=production
PORT=3000

# Database (use secure credentials)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=scenarioforge
DB_USER=scenarioforge_prod
DB_PASSWORD=<strong-password-here>

# Resource limits (adjust based on your hardware)
MAX_SIMULATION_ITERATIONS=500000
MAX_SIMULATION_TIME=600000
DB_POOL_MAX=20
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Install dependencies and build
pnpm install --frozen-lockfile
pnpm build

# Run database migrations
pnpm db:migrate

# Start API server
NODE_ENV=production node --max-old-space-size=2048 apps/api/dist/index.js
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","memory":{...},"uptime":...}
```

## Manual Deployment (without Docker)

### 1. Install PostgreSQL with TimescaleDB

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-15 postgresql-15-timescaledb

# Configure PostgreSQL
sudo -u postgres psql
CREATE DATABASE scenarioforge;
CREATE USER scenarioforge_prod WITH PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE scenarioforge TO scenarioforge_prod;
\c scenarioforge
CREATE EXTENSION timescaledb;
```

### 2. Install Redis (optional)

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 3. Build Application

```bash
cd ScenarioForge
pnpm install --frozen-lockfile
pnpm build
```

### 4. Configure Environment

Create `apps/api/.env`:

```bash
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scenarioforge
DB_USER=scenarioforge_prod
DB_PASSWORD=<your-password>
MAX_SIMULATION_ITERATIONS=500000
MAX_SIMULATION_TIME=600000
```

### 5. Run Migrations

```bash
pnpm db:migrate
```

### 6. Start Application

```bash
# With PM2 (recommended)
npm install -g pm2
pm2 start apps/api/dist/index.js --name scenarioforge-api --max-memory-restart 2G

# Or with systemd
sudo nano /etc/systemd/system/scenarioforge.service
```

Example systemd service file:

```ini
[Unit]
Description=ScenarioForge API
After=network.target postgresql.service

[Service]
Type=simple
User=scenarioforge
WorkingDirectory=/opt/scenarioforge
ExecStart=/usr/bin/node --max-old-space-size=2048 apps/api/dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Nginx Reverse Proxy

### Configuration

Create `/etc/nginx/sites-available/scenarioforge`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /opt/scenarioforge/apps/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 660s;  # Allow long simulations
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/scenarioforge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### Health Checks

Set up periodic health checks:

```bash
# Cron job to check health
*/5 * * * * curl -f http://localhost:3000/health || systemctl restart scenarioforge
```

### Application Logs

```bash
# With PM2
pm2 logs scenarioforge-api

# With systemd
journalctl -u scenarioforge -f
```

### Memory Monitoring

Monitor memory usage:

```bash
# Watch memory in real-time
watch -n 5 'curl -s http://localhost:3000/health | jq .memory'
```

### Database Monitoring

```bash
# PostgreSQL connection pool
SELECT count(*) as active_connections, 
       max_val as max_connections 
FROM pg_stat_activity, 
     (SELECT setting::int AS max_val FROM pg_settings WHERE name='max_connections') max;

# TimescaleDB compression stats
SELECT * FROM timescaledb_information.compressed_chunk_stats;
```

## Performance Tuning

### PostgreSQL Tuning

Edit `/etc/postgresql/15/main/postgresql.conf`:

```ini
# Memory
shared_buffers = 512MB
effective_cache_size = 2GB
maintenance_work_mem = 256MB
work_mem = 32MB

# Connection
max_connections = 50

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000  # Log slow queries
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Node.js Tuning

Adjust heap size based on available memory:

```bash
# For 4GB server
node --max-old-space-size=2048 apps/api/dist/index.js

# For 8GB server
node --max-old-space-size=4096 apps/api/dist/index.js
```

### Environment Variables

For high-load environments:

```bash
# High-performance settings
MAX_SIMULATION_ITERATIONS=1000000
MAX_SIMULATION_TIME=900000      # 15 minutes
DB_POOL_MAX=30
DB_POOL_MIN=10
REQUEST_TIMEOUT=960000          # 16 minutes
MAX_REQUEST_SIZE=100mb
```

## Backup and Recovery

### Database Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U scenarioforge_prod scenarioforge > /backup/scenarioforge_$DATE.sql
gzip /backup/scenarioforge_$DATE.sql

# Keep only last 7 days
find /backup -name "scenarioforge_*.sql.gz" -mtime +7 -delete
```

### Database Restore

```bash
gunzip -c /backup/scenarioforge_20240115.sql.gz | psql -U scenarioforge_prod scenarioforge
```

## Security Hardening

### 1. Database Security

```sql
-- Create read-only user for analytics
CREATE USER scenarioforge_readonly WITH PASSWORD '<password>';
GRANT CONNECT ON DATABASE scenarioforge TO scenarioforge_readonly;
GRANT USAGE ON SCHEMA public TO scenarioforge_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO scenarioforge_readonly;
```

### 2. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# PostgreSQL and Redis only from localhost
sudo ufw deny from any to any port 5432
sudo ufw deny from any to any port 6379
```

### 3. Environment Variables

Never commit `.env` files. Use secret management:

```bash
# Use environment-specific files
apps/api/.env.production
apps/api/.env.staging

# Or use secret management tools
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
```

## Scaling

### Horizontal Scaling (Multiple API Instances)

1. **Use a load balancer** (Nginx, HAProxy, AWS ALB)
2. **Share session state** via Redis
3. **Use read replicas** for PostgreSQL
4. **Distribute simulations** across workers

### Vertical Scaling

1. **Increase server resources** (CPU, RAM)
2. **Tune Node.js heap size** accordingly
3. **Adjust database connection pool** size
4. **Increase simulation limits** in `.env`

## Troubleshooting Production Issues

### High Memory Usage

```bash
# Check Node.js heap usage
curl http://localhost:3000/health | jq .memory

# If heapUsed > 80% of heapTotal:
# 1. Check for memory leaks
# 2. Reduce MAX_SIMULATION_ITERATIONS
# 3. Increase --max-old-space-size
# 4. Restart application
```

### Database Connection Exhaustion

```sql
-- Check active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '5 minutes';
```

### Slow Simulations

1. Check simulation complexity (number of nodes/edges)
2. Review expressions for performance issues
3. Consider reducing iteration count
4. Monitor database query performance
5. Check for CPU/IO bottlenecks

## Maintenance

### Regular Tasks

- **Daily**: Check logs for errors
- **Weekly**: Review memory usage trends
- **Monthly**: Database vacuum and analyze
- **Quarterly**: Security updates

### Database Maintenance

```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE scenarioforge;

-- Check for bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Application Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Run migrations
pnpm db:migrate

# Restart (with PM2)
pm2 restart scenarioforge-api

# Or with systemd
sudo systemctl restart scenarioforge
```

## Cost Optimization

### For Small Deployments (< 1000 simulations/day)

- 2 CPU cores, 4GB RAM
- 20GB SSD storage
- ~$20-40/month on AWS/DigitalOcean

### For Medium Deployments (1000-10000 simulations/day)

- 4 CPU cores, 8GB RAM
- 50GB SSD storage
- ~$80-120/month

### For Large Deployments (10000+ simulations/day)

- 8+ CPU cores, 16GB+ RAM
- 100GB+ SSD storage
- Load balancer + auto-scaling
- ~$300+/month

## Support

For production issues:
- Check application logs first
- Review [docs/MEMORY_CONFIGURATION.md](MEMORY_CONFIGURATION.md)
- Monitor `/health` endpoint
- Check database connection pool
- Review PostgreSQL slow query log

## Additional Resources

- [Memory Configuration Guide](MEMORY_CONFIGURATION.md)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/how-to-guides/configuration/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
