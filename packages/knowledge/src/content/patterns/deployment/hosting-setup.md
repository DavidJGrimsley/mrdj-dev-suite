# Hosting Setup Pattern

## Description

Hosting setup involves configuring servers, reverse proxies, SSL/TLS certificates, environment variables, and service management to deploy and run applications in production. This covers static hosting, server-side applications, API deployment, and monitoring.

## When to Use

**Configure hosting when:**
- ✅ Deploying web apps to production
- ✅ Setting up Node.js servers
- ✅ Configuring reverse proxies (nginx, Apache)
- ✅ Managing SSL/TLS certificates
- ✅ Deploying API servers
- ✅ Setting up domain and DNS
- ✅ Configuring service management (systemd, PM2)
- ✅ Monitoring and logging

## Core Concepts

**Hosting Stack Layers:**
```
1. Domain & DNS        → Domain registration, DNS records
2. Reverse Proxy       → nginx/Apache routing to backend
3. SSL/TLS             → Certificate generation and renewal
4. Application Runtime → Node.js, Python, etc.
5. Service Manager     → systemd, PM2, Docker
6. Logging & Monitoring→ Syslog, application logs
```

**Key Hosting Decisions:**
1. Static hosting vs. server-side
2. Single server vs. distributed
3. Docker containers vs. native
4. SSL certificate strategy
5. Service restart strategy

## Code Examples

### Static Hosting (Web Apps)

```yaml
# File: hosting-config.yml - Static web deployment
server:
  type: static
  files: ./dist/
  
domain:
  primary: example.com
  aliases:
    - www.example.com
  
ssl:
  provider: letsencrypt
  autoRenew: true
  
cache:
  staticAssets: 1y
  html: 1h
  
gzip: true
```

### Nginx Configuration

```nginx
# File: /etc/nginx/sites-available/app

upstream api_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name example.com www.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 256;
    
    # Static files
    location /assets/ {
        alias /var/www/app/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Service worker and manifest
    location ~ ^/(sw\.js|manifest\.json)$ {
        alias /var/www/app/dist/$uri;
        expires 24h;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # HTML files
    location ~ \.html?$ {
        alias /var/www/app/dist/;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://api_backend/;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Default location
    location / {
        alias /var/www/app/dist/;
        try_files $uri $uri/ /index.html;
        expires 1h;
    }
}
```

### Service Configuration (Systemd)

```ini
# File: /etc/systemd/system/app.service
[Unit]
Description=Node.js API Server
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/home/app/api-server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

# Environment
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=/home/app/api-server/.env

# Resource limits
MemoryLimit=512M
CPUQuota=100%
LimitNOFILE=65536

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=app

[Install]
WantedBy=multi-user.target
```

### Environment Configuration File

```bash
# File: /home/app/api-server/.env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@db.example.com:5432/appdb
DATABASE_SSL=true
DATABASE_POOL_MAX=10

# API Keys
JWT_SECRET=your-secret-key-here
API_KEY=your-api-key-here

# Service URLs
CORS_ORIGIN=https://example.com
APP_URL=https://example.com
```

### PM2 Configuration

```javascript
// File: ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart on crash
      autorestart: true,
      max_memory_restart: '500M',
      
      // Watch for changes (development)
      watch: process.env.NODE_ENV === 'development' ? ['.'] : false,
      ignore_watch: ['node_modules', 'logs'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health check
      max_restarts: 10,
      min_uptime: '10s',
    }
  ],
};
```

### SSL Certificate Setup (Let's Encrypt)

```bash
#!/bin/bash
# File: setup-ssl.sh

DOMAIN="example.com"
EMAIL="admin@example.com"

# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx \
  --non-interactive \
  --agree-tos \
  --email $EMAIL \
  -d $DOMAIN \
  -d www.$DOMAIN

# Auto-renewal setup
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify renewal
sudo certbot renew --dry-run
```

### Docker Deployment

```dockerfile
# File: Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Run app
CMD ["node", "server.js"]
```

```yaml
# File: docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:pass@db:5432/app
    depends_on:
      - db
    restart: always
    
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: always

volumes:
  db_data:
```

### Monitoring Setup

```bash
# File: monitoring.sh

# Monitor CPU and memory
watch -n 1 'ps aux | grep node'

# Monitor logs
tail -f /var/log/app.log

# Monitor open connections
netstat -an | grep ESTABLISHED | wc -l

# Monitor disk usage
df -h
```

## Hosting Best Practices

### ✅ DO

1. **Use reverse proxy (nginx/Apache)**
   ```nginx
   upstream backend {
       server 127.0.0.1:3000;
       server 127.0.0.1:3001;
   }
   ```

2. **Enable SSL/TLS**
   ```nginx
   ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
   ssl_protocols TLSv1.2 TLSv1.3;
   ```

3. **Set security headers**
   ```nginx
   add_header X-Frame-Options "DENY";
   add_header X-Content-Type-Options "nosniff";
   add_header X-XSS-Protection "1; mode=block";
   ```

4. **Monitor health and logs**
   ```bash
   systemctl status app
   tail -f /var/log/app.log
   ```

### ❌ DON'T

1. **Don't run app as root**
   ```ini
   # ❌ WRONG
   User=root
   
   # ✅ RIGHT
   User=app
   ```

2. **Don't expose secrets in logs**
   ```bash
   # ❌ WRONG - Logs secrets
   console.log('API_KEY:', process.env.API_KEY);
   
   # ✅ RIGHT - Don't log sensitive data
   console.log('API configured');
   ```

3. **Don't skip SSL/TLS**
   ```nginx
   # ❌ WRONG - No HTTPS
   listen 80;
   
   # ✅ RIGHT - HTTPS + redirect
   listen 443 ssl;
   listen 80;
   return 301 https://...;
   ```

## Related Patterns

- [Build Configuration](./build-configuration.md) — Build setup
- [CI/CD Patterns](./ci-cd-patterns.md) — Automated deployment
- [Environment Configuration](./environment-config.md) — Environment variables

---

*Pattern extracted from production repositories: time2pay, PokePages, DJsPortfolio*
*Files: nginx.conf, systemd services, environment setup scripts*