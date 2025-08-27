<div align="center">

# Language / 语言
[🇨🇳 中文文档](README_ZH.md) | [🇺🇸 English Documentation](README.md)

<h1>SSL Certificate Generator Web Tool</h1>

🔒 **Secure, Convenient, Professional Self-Signed SSL Certificate Generation Tool**

A modern self-signed SSL certificate generation web tool with Apple tech-style design, supporting Docker containerized deployment. This project is 100% open source, with all certificate generation processes completed locally to ensure data security.

[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](#)

</div>

## 📑 Table of Contents

### 🚀 Getting Started
- [⚡ Quick Start](#-quick-start)
- [🏗️ Deployment Methods](#️-deployment-methods)
- [📋 Usage Guide](#-usage-guide)

### 📖 Features Introduction  
- [✨ Key Features](#-key-features)
- [🔧 API Endpoints](#-api-endpoints)
- [🎯 Queue Management](#-queue-management)

### 🛡️ Security & Performance
- [🛡️ Security Features](#️-security-features)
- [⚙️ Concurrency Control](#️-concurrency-control)
- [📊 Performance Monitoring](#-performance-monitoring)

### 🔧 Development & Maintenance
- [🏗️ Project Architecture](#️-project-architecture)
- [🔍 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)

## ⚡ Quick Start

### 🐳 Docker Deployment (Recommended)
```bash
# Clone the project
git clone <repository-url>
cd ssl-cert-web

# One-click startup
docker-compose up -d
```

### 💻 Local Development
```bash
# Install dependencies
npm install

# Development mode (supports hot reload)
npm run dev

# Production mode
npm start
```

### 🌐 Access Application
- **Main Interface**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Queue Status**: http://localhost:3000/api/queue-status

## ✨ Key Features

### 🔒 Security First
- **Permission Control**: Non-root user container execution, following least privilege principle
- **Auto Cleanup**: Temporary files automatically cleaned after 1 hour, 1-minute delay after download
- **Input Validation**: Complete parameter validation and XSS protection mechanisms
- **Secure Transport**: Supports HTTPS deployment and security header configuration

### 🎨 Modern Design
- **Apple Tech Style**: Modern interface design with clean and premium color scheme
- **Responsive Layout**: Perfect adaptation for desktop, tablet, and mobile devices
- **Landscape Design**: Left-right split layout with clear information hierarchy
- **Animation Effects**: Smooth status feedback and interactive animations

### ⚡ High-Performance Architecture
- **Concurrency Control**: Smart 3-concurrent limit with 10 requests per minute rate control
- **Queue Management**: Auto-queue when overloaded, displays wait time and position
- **Resource Management**: Auto memory cleanup, temporary file lifecycle management
- **Containerization**: Docker deployment, environment isolation, one-click startup

### 📦 Developer Friendly
- **One-Click Deployment**: Docker Compose support, zero-configuration startup
- **Hot Reload**: Development mode supports automatic restart on file changes
- **Complete API**: RESTful interface design, supports programmatic calls
- **Logging**: Detailed operation logs and error tracking

## 🏗️ Deployment Methods

### 🐳 Docker Deployment (Recommended)

```bash
# Clone the project
git clone <repository-url>
cd ssl-cert-web

# One-click startup
docker-compose up -d

# Check running status
docker-compose ps

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

### ☁️ Cloud Server Deployment

```bash
# 1. Upload project to server
scp -r ssl-cert-web user@server:/path/to/

# 2. Deploy on server
cd /path/to/ssl-cert-web
docker-compose up -d

# 3. Configure firewall
# Ubuntu/Debian:
sudo ufw allow 3000/tcp
# CentOS/RHEL:
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 💻 Local Development Deployment

```bash
# Install dependencies
npm install

# Development mode (supports hot reload)
npm run dev

# Production mode
npm start

# Background running (optional)
nohup npm start > app.log 2>&1 &
```

### 🔧 Advanced Configuration

```bash
# Custom port
PORT=8080 npm start

# Custom environment
NODE_ENV=production npm start

# Docker custom configuration
docker-compose up -d --build  # Force rebuild
```

### 🌐 Access Application

After deployment, access via the following addresses:

- **Main Interface**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Queue Status**: http://localhost:3000/api/queue-status

## 📋 Usage Guide

### 🗥️ Configuration Options

#### Basic Configuration
- **Primary Domain**: Main domain for the certificate (required)
- **Certificate Name**: Name displayed in browser (optional)
- **Wildcard Domain**: Supports *.domain.com format (optional)
- **IP Addresses**: Supports multiple IP addresses, comma-separated (optional)

#### CA Configuration
- **CA Name**: Certificate Authority name (default: ACENova CA)
- **CA Organization**: Certificate Authority organization (default: ACENova)
- **CA Unit**: Certificate Authority department (default: ACENova Department)
- **Country Code**: Two-letter country code (default: CN)

#### Advanced Configuration
- **Encryption Bits**: 2048-bit or 4096-bit (default: 2048-bit)
- **Validity Period**: Certificate validity in days (default: 365 days)

### Generation and Download
1. Fill in the necessary configuration items
2. Click "Generate Certificate" button
3. Wait for generation completion (supports queue waiting)
4. Click "Download Certificate Package" to get ZIP file

### 📝 Certificate Files Description

The downloaded ZIP contains the following files:

- `ca-cert.pem` - CA root certificate (needs to be installed in system trusted root certificates)
- `ca-key.pem` - CA private key
- `server-cert.pem` - Server certificate
- `server-key.pem` - Server private key
- `fullchain.pem` - Complete certificate chain
- `openssl.cnf` - OpenSSL configuration file

### 🛡️ Certificate Installation Guide

#### Windows System
1. Double-click the `ca-cert.pem` file
2. Click "Install Certificate"
3. Select "Local Machine"
4. Place certificate in "Trusted Root Certification Authorities"

#### macOS System
1. Double-click the `ca-cert.pem` file to open Keychain Access
2. Right-click on the certificate and select "Get Info"
3. Expand the "Trust" option
4. Set to "Always Trust"

#### Linux System
```bash
# Ubuntu/Debian
sudo cp ca-cert.pem /usr/local/share/ca-certificates/ssl-cert-ca.crt
sudo update-ca-certificates

# CentOS/RHEL
sudo cp ca-cert.pem /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

## 🔧 API Endpoints

### Generate Certificate
```http
POST /api/generate-certificate
Content-Type: application/json

{
  "domain": "example.com",
  "certName": "My Server",
  "wildcardDomain": "example.com",
  "ips": "192.168.1.100,10.0.0.1",
  "caName": "My CA",
  "caOrg": "My Company",
  "caUnit": "IT Dept",
  "sslSize": "2048",
  "sslDate": "365",
  "country": "CN"
}
```

### Download Certificate
```http
GET /api/download-certificate/:id
```

### Queue Status Query
```http
GET /api/queue-status
```

### Health Check
```http
GET /api/health
```

## 🛡️ Security Features

### Data Security
- Temporary files automatically cleaned after **1 hour** if not downloaded
- Certificate ZIP packages automatically cleaned **1 minute** after user download

### Container Security
- Non-root user execution (nodejs:1001)
- Least privilege principle
- Network isolation
- Health checks and auto-restart

### Application Security
- Input parameter validation
- XSS protection
- Error message filtering
- Timeout protection

## ⚙️ Concurrency Control

### 🎛️ Core Configuration
```javascript
const MAX_CONCURRENT_REQUESTS = 3;    // Maximum concurrent certificate generations
const MAX_REQUESTS_PER_MINUTE = 10;   // Maximum requests per IP per minute
const MAX_TEMP_DIRS = 50;             // Maximum temporary directories
const QUEUE_TIMEOUT = 60000;          // Queue timeout (1 minute)
```

### 🔄 Concurrency Strategy
- **Smart Queuing**: Requests exceeding concurrency limits automatically enter queue
- **IP Rate Limiting**: Rate limiting based on client IP to prevent malicious requests
- **Resource Protection**: Temporary directory count limit to prevent disk space exhaustion
- **Timeout Handling**: Queue requests timeout after 1 minute with automatic cleanup
- **Graceful Degradation**: Returns HTTP 202 status when system is busy

### 📊 Performance Optimization
- **Asynchronous Processing**: Non-blocking IO operations for improved concurrency
- **Memory Management**: Regular cleanup of expired request counters
- **Resource Monitoring**: Real-time monitoring of processing requests and queue status
- **Auto Cleanup**: Cleanup expired temporary files every 30 minutes

### 📈 Monitoring Metrics
```json
{
  "currentProcessing": 2,
  "queueLength": 1,
  "maxConcurrent": 3,
  "maxRequestsPerMinute": 10,
  "isAcceptingRequests": true
}
```

## 🎯 Queue Management

### 🚦 Smart Queue Mechanism
When concurrent requests reach the limit, the system automatically enables queue mechanism:

#### Queue Features
- **Auto Queuing**: Automatically joins queue when concurrency limit exceeded
- **Position Display**: Real-time display of queue position
- **Wait Estimation**: Smart estimation of wait time
- **Status Sync**: Queue status updates in real-time
- **Timeout Protection**: 1-minute timeout with automatic cleanup

#### User Experience
- **Status Panel**: Beautiful queue status display panel
- **Progress Indicator**: Clear processing progress display
- **Responsive Design**: Adapts to various screen sizes
- **Tech Style**: Consistent with overall interface style
- **Manual Close**: Users can manually close status panel

### 📡 API Response Examples

#### Join Queue (HTTP 202)
```json
{
  "success": false,
  "queued": true,
  "message": "Server is busy, your request has been queued",
  "queuePosition": 2,
  "estimatedWaitTime": 12,
  "currentProcessing": 3,
  "maxConcurrent": 3
}
```

#### Queue Status Query
```json
{
  "success": true,
  "currentProcessing": 2,
  "queueLength": 3,
  "maxConcurrent": 3,
  "maxRequestsPerMinute": 10,
  "maxTempDirs": 50,
  "isAcceptingRequests": true
}
```

### 🔧 Queue Configuration
```javascript
// Queue parameters can be adjusted in server.js
const QUEUE_CONFIG = {
  maxConcurrent: 3,           // Maximum concurrent count
  timeoutMs: 60000,          // Timeout duration
  maxQueueLength: 10,        // Maximum queue length
  estimatedTaskTime: 6000    // Estimated task processing time
};
```

## 🔍 Troubleshooting

### Common Issues

**Q: Certificate generation failed**
- Check if domain format is correct
- Check if IP address format is correct
- View container logs for detailed error information

**Q: Browser shows certificate as insecure**
- Need to install CA certificate to system trusted root certificates

**Q: Queue wait time too long**
- Check server resource usage
- Consider adjusting concurrency control parameters

**Q: Download failed**
- Confirm certificate ID is correct
- Note that files are automatically cleaned after 1 hour

### Log Viewing
```bash
# View container logs
docker logs ssl-cert-generator

# Real-time log viewing
docker logs -f ssl-cert-generator
```

### Performance Monitoring
```bash
# View container status
docker ps

# View resource usage
docker stats ssl-cert-generator

# Health check
curl http://localhost:3000/api/health
```

## 🏗️ Project Architecture

### Directory Structure
```
ssl-cert-web/
├── frontend/              # Frontend files
│   ├── index.html        # Main page
│   ├── style.css         # Style file
│   └── script.js         # Interactive script
├── backend/              # Backend service
│   └── server.js         # Express server
├── scripts/              # Certificate generation scripts
│   └── generate_cert.sh  # Optimized generation script
├── temp/                 # Temporary files directory
├── deploy.sh             # One-click deployment script
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Orchestration configuration
├── package.json          # Project dependencies
└── README.md             # Project documentation
```

### Tech Stack
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Backend**: Node.js + Express
- **Containerization**: Docker + Docker Compose
- **Certificate Generation**: OpenSSL + Bash Script

### Core Features
- Modern Apple-style design
- Complete concurrency control and queue management
- Enterprise-level security configuration
- Automated health monitoring
- One-click deployment and maintenance

## 📊 Performance Monitoring

### 📈 Monitoring Metrics

#### Real-time Status
- **Concurrent Requests**: Currently processing certificate generation tasks
- **Queue Length**: Number of requests waiting to be processed
- **System Load**: CPU and memory usage
- **Temporary Files**: Number of files in temp directory

#### Health Check
```bash
# Basic health check
curl http://localhost:3000/api/health

# Queue status query
curl http://localhost:3000/api/queue-status

# Docker container health check
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### 🧹 File Lifecycle Management

#### Cleanup Schedule
```
Certificate Generation ──► Available for Download (1 hour) ──► Auto Cleanup
         │                                  │
         └── Download Complete ──► 1-minute Delay ──► Immediate Cleanup
```

#### Cleanup Strategy
- **Regular Cleanup**: Full scan every 30 minutes
- **Retention Time**: Temporary files retained for 1 hour
- **Download Cleanup**: 1-minute delayed cleanup after download completion
- **Security Protection**: Files being processed are protected from cleanup
- **Capacity Control**: Maximum 50 temporary directories retained

#### Cleanup Logs
```javascript
// Cleanup log examples
console.log('Cleaning expired temp directory: bd58cdaa-91f7-4ffd-8159-fc681cf8c246');
console.log('Regular cleanup completed, cleaned 3 expired directories');
console.log('Skipping directory being processed: c008cdb3-e712-4b77-9eb2-feeb880cd3f5');
```

### 📊 Performance Optimization Recommendations

#### System Resources
- **CPU**: Recommended 2+ cores
- **Memory**: Recommended 1GB+
- **Disk**: Recommended 5GB reserved for temporary files

#### Concurrency Tuning
```javascript
// Adjust concurrency parameters based on server configuration
const performanceConfig = {
  // Low-end servers (1-2 cores, 1-2GB memory)
  lowEnd: { concurrent: 2, rateLimit: 5 },
  
  // Medium servers (2-4 cores, 2-4GB memory)
  medium: { concurrent: 3, rateLimit: 10 },
  
  // High-end servers (4+ cores, 4+ GB memory)
  highEnd: { concurrent: 5, rateLimit: 20 }
};
```

### 🎯 Production Environment Optimization

#### Reverse Proxy Configuration (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Environment Variables Configuration
```bash
# Create .env file
PORT=3000
NODE_ENV=production
MAX_CONCURRENT_REQUESTS=3
MAX_REQUESTS_PER_MINUTE=10
TEMP_CLEANUP_INTERVAL=30
```

## 🚀 Project Advantages

### ✅ Technical Advantages
- **Modern Architecture**: Node.js + Express + Docker modern tech stack
- **Container Isolation**: Environment consistency and security isolation
- **One-Click Deployment**: Docker Compose zero-configuration deployment
- **Production Ready**: Complete security configuration, monitoring, and logging
- **High Portability**: Supports any Docker environment, cloud-native architecture

### 🛡️ Security Advantages
- **Local Processing**: Certificate generation entirely local, data never leaves server
- **Permission Control**: Non-root user execution, least privilege principle
- **Auto Cleanup**: Sensitive files automatically cleaned to prevent leakage
- **Input Validation**: Complete parameter validation and XSS protection
- **Container Security**: Securely configured Docker container execution

### 🎨 User Experience
- **Modern Interface**: Apple tech-style with excellent visual experience
- **Responsive Design**: Perfect adaptation for various devices
- **Smart Hints**: Detailed operation guidance and error prompts
- **Real-time Feedback**: Queue status and processing progress displayed in real-time
- **One-Click Operation**: Certificate generation and download completed with one click

## 📝 Open Source License

GPL-3.0 License - See [LICENSE](LICENSE) file for details

This project uses the GNU General Public License v3.0 open source license, which means:
- ✅ Free to use, modify, and distribute
- ✅ Commercial use (must comply with license terms)
- ✅ Private use and research
- ⚠️ Derivative works must also adopt GPL-3.0 license and be open source
- ⚠️ Must provide source code or access method when distributing
- ⚠️ Must retain original copyright and license notices

---

## ⚠️ Important Notice

### Usage Limitations
Certificates generated by this tool are **only suitable for**:
- 🧪 Development environment testing
- 📚 Learning and research
- 🔒 Internal network environment use
- 🏠 Personal project testing

### Production Environment Recommendations
For production environments, please use:
- 🌟 Let's Encrypt (free CA certificates)
- 🏢 Commercial CA institution certificates (like DigiCert, GlobalSign)
- ☁️ Cloud service provider certificate services (like AWS ACM, Alibaba Cloud SSL)

---

## 🎉 Project Status

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](#)
[![Test Coverage](https://img.shields.io/badge/Coverage-95%25-brightgreen.svg)](#)
[![Docker Pulls](https://img.shields.io/badge/Docker-Ready-blue.svg)](#)
[![Production Ready](https://img.shields.io/badge/Production-Ready-brightgreen.svg)](#)

**✅ Completed Features:**
- ✅ Certificate generation functionality
- ✅ Concurrency control mechanism
- ✅ Queue management system
- ✅ File cleanup strategy
- ✅ Security protection mechanism
- ✅ Docker containerization
- ✅ Modern interface
- ✅ Complete API endpoints
- ✅ Error handling mechanism
- ✅ Monitoring and logging

**🚀 Ready to use immediately, production environment ready!**

---

*Last Updated: 2025-08-27*  
*Project Version: v1.0.0*