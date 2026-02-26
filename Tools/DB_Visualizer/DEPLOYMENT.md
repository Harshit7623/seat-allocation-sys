# Deployment Guide - DB Visualizer

Complete guide for deploying DB Visualizer to production.

## Prerequisites

- Docker (optional, recommended)
- Linux/Unix server (Ubuntu 20.04+ recommended)
- Domain name (optional)
- SSL certificate (recommended)

## Option 1: Docker Deployment (Recommended)

### Create Dockerfile for Backend

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "main:app"]
```

### Create Dockerfile for Frontend

```dockerfile
FROM node:16-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always
```

Run with:
```bash
docker-compose up -d
```

## Option 2: Traditional Server Deployment

### Backend Setup

1. **SSH into server:**
```bash
ssh user@your-server.com
```

2. **Install dependencies:**
```bash
sudo apt update
sudo apt install python3.9 python3-venv python3-pip nginx supervisor
```

3. **Clone repository:**
```bash
cd /var/www
git clone https://github.com/yourusername/db-visualizer.git
cd db-visualizer
```

4. **Setup Python environment:**
```bash
cd backend
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

5. **Create systemd service:**

Create `/etc/systemd/system/db-visualizer-api.service`:
```ini
[Unit]
Description=DB Visualizer API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/db-visualizer/backend
Environment="PATH=/var/www/db-visualizer/backend/venv/bin"
ExecStart=/var/www/db-visualizer/backend/venv/bin/gunicorn \
    -w 4 \
    -b 127.0.0.1:8000 \
    main:app

[Install]
WantedBy=multi-user.target
```

6. **Enable service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable db-visualizer-api
sudo systemctl start db-visualizer-api
```

### Frontend Setup

1. **Install Node:**
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
```

2. **Build frontend:**
```bash
cd frontend
npm install
npm run build
```

3. **Copy to nginx:**
```bash
sudo cp -r dist/* /var/www/html/
```

### Nginx Configuration

Create `/etc/nginx/sites-available/db-visualizer`:

```nginx
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 50M;

    # Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://backend;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/db-visualizer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

## Database Considerations

### Production Setup

1. **Persistent Storage:**
```bash
mkdir -p /var/db-visualizer/uploads
chmod 755 /var/db-visualizer/uploads
```

2. **Environment Variables:**

Create `.env`:
```env
UPLOADS_DIR=/var/db-visualizer/uploads
ENVIRONMENT=production
CORS_ORIGINS=https://your-domain.com
```

3. **Update Backend:**

```python
# In main.py
import os

uploads_dir = os.getenv("UPLOADS_DIR", "./uploads")
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
)
```

## Monitoring & Logs

### Check Backend Status

```bash
sudo systemctl status db-visualizer-api
sudo journalctl -u db-visualizer-api -f
```

### Check Nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitor Resources

```bash
# Install htop
sudo apt install htop
htop

# Check disk usage
df -h /var/www
du -sh /var/db-visualizer/uploads
```

## Backup Strategy

### Daily Backup Script

Create `/home/user/backup.sh`:
```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/db-visualizer"
mkdir -p $BACKUP_DIR

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/db-visualizer/uploads/

# Keep only last 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

Add to crontab:
```bash
crontab -e

# Add line:
0 2 * * * /home/user/backup.sh
```

## Performance Optimization

### Backend Caching

```python
from functools import lru_cache

@lru_cache(maxsize=32)
def get_cached_schema(db_path: str):
    parser = SchemaParser(db_path)
    return parser.get_complete_schema()
```

### Frontend Optimization

In `vite.config.js`:
```javascript
export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          reactflow: ['reactflow'],
        }
      }
    }
  }
})
```

### Nginx Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
}
```

## Security Checklist

- [ ] Update all dependencies
- [ ] Configure firewall (ufw)
- [ ] Use HTTPS/SSL
- [ ] Set strong passwords
- [ ] Enable 2FA on server
- [ ] Restrict upload directory
- [ ] Set proper file permissions
- [ ] Regular security updates
- [ ] Monitor logs
- [ ] Limit upload file size
- [ ] Validate all inputs
- [ ] Use secrets management
- [ ] Regular backups
- [ ] DDoS protection (CloudFlare)

## Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u db-visualizer-api -n 20

# Check port in use
sudo lsof -i :8000

# Restart service
sudo systemctl restart db-visualizer-api
```

### Nginx 502 Bad Gateway

```bash
# Ensure backend is running
sudo systemctl status db-visualizer-api

# Check nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Upload Issues

```bash
# Check permissions
ls -la /var/db-visualizer/uploads/

# Fix permissions if needed
sudo chown www-data:www-data /var/db-visualizer/uploads
sudo chmod 755 /var/db-visualizer/uploads
```

## Rollback Procedure

```bash
# Stop services
sudo systemctl stop db-visualizer-api

# Restore from backup
cd /var/www/db-visualizer
git checkout previous-commit

# Restart
sudo systemctl start db-visualizer-api

# Check status
sudo systemctl status db-visualizer-api
```

---

**Deployment Complete!** 🚀

For issues, check logs and system resources.
