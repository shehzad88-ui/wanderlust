# Wanderlust Application - 4-Tier Deployment Documentation

**Prepared by:** Moaaz Saleem | **Date:** 11 April 2026 | **Server IP:** 20.174.160.252 | **Domain:** moaazsaleem.online | **Platform:** Microsoft Azure VM (Ubuntu 24.04)

---

## 1. Project Overview

Wanderlust is a full-stack travel blog platform. Users can read, create, and explore travel posts organized by categories like Beaches, Adventure, City, Nature, and Landmarks. The project was deployed on a Microsoft Azure Virtual Machine following **6 progressive deployment steps** — starting from a basic PM2 + Nginx setup and ending with a fully containerized Docker Compose architecture.

**Live URL:** http://20.174.160.252

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (TypeScript) |
| Backend | Node.js + Express.js |
| Database | MongoDB 6 |
| Cache | Redis 7 |
| Web Server | Nginx |
| Process Manager | PM2 |
| Containerization | Docker + Docker Compose |
| Cloud Platform | Microsoft Azure VM (Ubuntu 24.04) |

---

## 3. Server Setup & Prerequisites

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
# PM2
npm install -g pm2
# MongoDB
sudo apt install mongodb -y && sudo systemctl enable mongod
# Redis
sudo apt install redis -y && sudo systemctl enable redis
# Nginx
sudo apt install nginx -y && sudo systemctl enable nginx
# Docker
sudo apt install docker.io -y && sudo systemctl enable docker
sudo usermod -aG docker ubuntu
# Docker Compose
sudo apt install docker-compose -y
```

**Project Structure:**
```
/wanderlust/wnader-lust/
├── frontend/        (React + Vite)
├── backend/         (Node.js + Express)
├── nginx/           (Dockerized Nginx)
└── docker-compose.yml
```

**Backend `.env`:**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/wanderlust
REDIS_URL=redis://127.0.0.1:6379
```

**Frontend `.env`:**
```
VITE_API_PATH=http://20.174.160.252
```

---

## 4. Deployment Steps

### ✅ Step 1 — Nginx Reverse Proxy → React Dev Server + PM2 Backend

**Flow:** `Browser → Port 80 (Nginx) → Port 3000 (React Dev) / Port 5000 (PM2 Backend)`

```bash
cd /wanderlust/wnader-lust/frontend
pm2 start "npm run dev -- --port 3000 --host" --name frontend
pm2 save
cd /wanderlust/wnader-lust/backend
pm2 start ecosystem.config.cjs
pm2 save
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### ✅ Step 2 — Nginx Serving Built React (Static) + PM2 Backend

**Flow:** `Browser → Port 80 (Nginx serves /dist) / Port 5000 (PM2 Backend)`

```bash
cd /wanderlust/wnader-lust/frontend
npm run build
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name _;
    root /wanderlust/wnader-lust/frontend/dist;
    index index.html;
    location / { try_files $uri /index.html; }
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### ✅ Step 3 — Nginx Reverse Proxy → Dockerized React + PM2 Backend

**Flow:** `Browser → Port 80 (Nginx) → Port 3000 (Docker: React) / Port 5000 (PM2 Backend)`

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm","run","dev","--","--host","--port","3000"]
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import path from 'path'
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { host: '0.0.0.0', port: 3000 }
})
```

```bash
pm2 stop 1
cd /wanderlust/wnader-lust/frontend
docker build -t frontend:v1 .
docker run -d --name frontend -p 3000:3000 frontend:v1
```

---

### ✅ Step 4 — Nginx + Dockerized React + Dockerized Backend

**Flow:** `Browser → Port 80 (Nginx) → Port 3000 (Docker: React) / Port 5000 (Docker: Backend)`

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node","server.js"]
```

```bash
pm2 stop 0
cd /wanderlust/wnader-lust/backend
docker build -t backend:v1 .
docker run -d --name backend --network host \
  -e MONGO_URI=mongodb://localhost:27017/wanderlust \
  -e REDIS_URL=redis://127.0.0.1:6379 \
  -e PORT=5000 backend:v1
```

---

### ✅ Step 5 — Docker Compose (All Services)

**Flow:** `Browser → Port 80 (Nginx host) → Docker Network (frontend, backend, mongodb, redis)`

**docker-compose.yml:**
```yaml
version: "3.8"
services:
  frontend:
    build: ./frontend
    container_name: frontend
    expose:
      - "3000"
    depends_on:
      - backend
  backend:
    build: ./backend
    container_name: backend
    network_mode: host
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://localhost:27017/wanderlust
      - REDIS_URL=redis://127.0.0.1:6379
    depends_on:
      - mongodb
      - redis
  mongodb:
    image: mongo:6
    container_name: mongodb
    volumes:
      - mongo_data:/data/db
  redis:
    image: redis:7-alpine
    container_name: redis
volumes:
  mongo_data:
```

```bash
sudo systemctl stop mongod
sudo systemctl stop redis
docker-compose up -d
docker-compose ps
```

---

### ✅ Step 6 — Fully Dockerized Nginx + Docker Compose

**Flow:** `Browser → Port 80 (Docker: Nginx) → frontend:3000 / backend:5000 → mongodb:27017 + redis:6379`

**nginx/Dockerfile:**
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx/nginx.conf:**
```nginx
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name _;
        location /api/ {
            proxy_pass http://backend:5000/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

**Final docker-compose.yml:**
```yaml
version: "3.8"
services:
  nginx:
    build: ./nginx
    container_name: nginx
    ports:
      - "80:80"
    depends_on:
      - frontend
      - backend
  frontend:
    build: ./frontend
    container_name: frontend
    expose:
      - "3000"
    depends_on:
      - backend
  backend:
    build: ./backend
    container_name: backend
    expose:
      - "5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/wanderlust
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
  mongodb:
    image: mongo:6
    container_name: mongodb
    volumes:
      - mongo_data:/data/db
  redis:
    image: redis:7-alpine
    container_name: redis
volumes:
  mongo_data:
```

```bash
sudo systemctl stop nginx
docker-compose down
docker-compose up -d --build
docker-compose ps
```

---

## 5. Errors & Fixes

| # | Error | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | `MongooseError: uri must be a string, got undefined` | `utils.js` used `MONGODB_URI` but `.env` had `MONGO_URI` | Changed to `process.env.MONGO_URI` in utils.js |
| 2 | `Nginx: Permission Denied on index.html` | Nginx couldn't read the dist folder | `chmod 755` on dist directory |
| 3 | `Nginx redirect loop on /index.html` | Conflicting `try_files` directive | Rewrote config with correct `proxy_pass` |
| 4 | `White screen — map is not a function` | Frontend used `VITE_API_URL` but code expected `VITE_API_PATH` | Renamed env variable to `VITE_API_PATH` |
| 5 | `ERR_CONNECTION_REFUSED on port 5000` | Azure firewall blocking port 5000 externally | Changed API path to use port 80 through Nginx |
| 6 | `Docker: ECONNREFUSED 127.0.0.1:27017` | Inside Docker, localhost = container, not host VM | Used `--network host` flag on backend container |
| 7 | `Cannot find package @vitejs/plugin-react` | vite.config.ts imported uninstalled package | Rewrote vite.config.ts without the plugin import |
| 8 | `Docker Compose frontend Exit 1` | Old Docker image cached broken vite.config | Deleted image and rebuilt: `docker rmi wnader-lust_frontend` |
| 9 | `PM2 losing env variables on restart` | PM2 doesn't auto-load `.env` on restart | Created `ecosystem.config.cjs` with hardcoded env vars |
| 10 | `API returning [] after data insert` | Redis cached empty `[]` before data was inserted | Ran `docker exec -it redis redis-cli FLUSHALL` |
| 11 | `Featured posts always returning []` | Data inserted with `featured: true` but model uses `isFeaturedPost` | Re-inserted data with correct field name `isFeaturedPost: true` |

---

## 6. Final Application State

```
docker-compose ps

Container   Image            Port    Status
--------------------------------------------
nginx       nginx:alpine     80      ✅ Up
frontend    node:18-alpine   3000    ✅ Up
backend     node:18-alpine   5000    ✅ Up
mongodb     mongo:6          27017   ✅ Up
redis       redis:7-alpine   6379    ✅ Up
```

**Request Flow:**
```
Browser → http://20.174.160.252 (Port 80)
  └── Docker: Nginx
        ├── / ──────→ Docker: Frontend (Port 3000)
        └── /api/ ──→ Docker: Backend (Port 5000)
                            ├── Docker: MongoDB (Port 27017)
                            └── Docker: Redis (Port 6379)
```

---

## 7. Commands Reference

```bash
# Docker
docker-compose ps                          # Check all services
docker-compose logs --tail=20              # View all logs
docker-compose down                        # Stop all
docker-compose up -d --build               # Rebuild and start
docker exec -it mongodb mongosh            # MongoDB shell
docker exec -it redis redis-cli FLUSHALL   # Clear Redis cache

# PM2
pm2 status                                 # Check processes
pm2 logs 0 --lines 20                     # Backend logs
pm2 restart 0 --update-env               # Restart with new env

# Nginx
sudo nginx -t                              # Test config
sudo systemctl reload nginx               # Reload
sudo tail -f /var/log/nginx/access.log   # Live logs

# MongoDB (inside mongosh)
use wanderlust
db.posts.find()
db.posts.find().count()
db.posts.deleteMany({})
```

---

***Best Regards :***
---

***Moaaz Saleem :***
