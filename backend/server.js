const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// 并发控制配置
const MAX_CONCURRENT_REQUESTS = 3; // 最大并发证书生成数
const MAX_REQUESTS_PER_MINUTE = 10; // 每分钟最大请求数
const MAX_TEMP_DIRS = 50; // 最大临时目录数量

// 并发控制变量
let currentRequests = 0;
const requestQueue = [];
const requestCounts = new Map(); // IP请求计数
const processingRequests = new Set(); // 正在处理的请求ID

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 速率限制中间件
app.use('/api/generate-certificate', (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${clientIP}:${minute}`;
    
    // 清理过期的计数器
    for (const [k, v] of requestCounts.entries()) {
        if (Math.floor(v.timestamp / 60000) < minute - 1) {
            requestCounts.delete(k);
        }
    }
    
    // 检查速率限制
    const count = requestCounts.get(key) || { count: 0, timestamp: now };
    if (count.count >= MAX_REQUESTS_PER_MINUTE) {
        return res.status(429).json({
            success: false,
            message: '请求过于频繁，请稍后再试'
        });
    }
    
    // 更新计数器
    requestCounts.set(key, { count: count.count + 1, timestamp: now });
    next();
});

// 创建临时目录
const TEMP_DIR = path.join(__dirname, '../temp');
const SCRIPTS_DIR = path.join(__dirname, '../scripts');

// 确保目录存在
fs.ensureDirSync(TEMP_DIR);

// 并发控制函数
async function checkConcurrencyLimits() {
    // 检查临时目录数量
    try {
        const tempDirs = await fs.readdir(TEMP_DIR);
        const dirCount = tempDirs.filter(async (dir) => {
            const dirPath = path.join(TEMP_DIR, dir);
            const stats = await fs.stat(dirPath).catch(() => null);
            return stats && stats.isDirectory();
        }).length;
        
        if (dirCount >= MAX_TEMP_DIRS) {
            throw new Error('系统忙，请稍后再试');
        }
    } catch (error) {
        console.error('检查临时目录失败:', error);
    }
}

// 队列处理函数
async function processQueue() {
    if (requestQueue.length === 0 || currentRequests >= MAX_CONCURRENT_REQUESTS) {
        return;
    }
    
    const { req, res, resolve, reject } = requestQueue.shift();
    currentRequests++;
    
    try {
        const result = await generateCertificateInternal(req);
        resolve(result);
        
        // 只有当res不为null时才发送响应（非队列请求）
        if (res) {
            res.json({
                success: true,
                ...result
            });
        }
    } catch (error) {
        reject(error);
        
        // 只有当res不为null时才发送错误响应
        if (res) {
            res.status(500).json({
                success: false,
                message: error.message || '证书生成失败'
            });
        }
    } finally {
        currentRequests--;
        // 处理下一个队列任务
        setImmediate(processQueue);
    }
}

// 证书生成API
app.post('/api/generate-certificate', async (req, res) => {
    try {
        // 检查并发限制
        await checkConcurrencyLimits();
        
        // 如果当前请求数超过限制，加入队列
        if (currentRequests >= MAX_CONCURRENT_REQUESTS) {
            const queuePosition = requestQueue.length + 1;
            const estimatedWaitTime = Math.ceil((currentRequests + requestQueue.length) * 2); // 估算等待时间（秒）
            
            // 立即返回队列状态信息
            res.status(202).json({
                success: false,
                queued: true,
                message: '服务器正忙，您的请求已加入队列',
                queuePosition: queuePosition,
                estimatedWaitTime: estimatedWaitTime,
                currentProcessing: currentRequests,
                maxConcurrent: MAX_CONCURRENT_REQUESTS
            });
            
            return new Promise((resolve, reject) => {
                requestQueue.push({ req, res: null, resolve, reject }); // res设为null，因为已经响应了
                
                // 设置超时
                setTimeout(() => {
                    const index = requestQueue.findIndex(item => item.req === req);
                    if (index !== -1) {
                        requestQueue.splice(index, 1);
                        reject(new Error('请求超时，请重试'));
                    }
                }, 60000); // 1分钟超时
            });
        }
        
        // 直接处理请求
        currentRequests++;
        const result = await generateCertificateInternal(req);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('证书生成失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '证书生成失败'
        });
    } finally {
        currentRequests--;
        // 处理队列中的下一个请求
        setImmediate(processQueue);
    }
});

// 证书生成内部函数
async function generateCertificateInternal(req) {
    const certificateId = uuidv4();
    const outputDir = path.join(TEMP_DIR, certificateId);
    
    // 添加到正在处理的请求集合
    processingRequests.add(certificateId);
    
    try {
        console.log('开始生成证书，ID:', certificateId);
        console.log('请求参数:', req.body);
        
        // 确保输出目录存在
        await fs.ensureDir(outputDir);
        
        // 构建命令参数
        const args = buildScriptArgs(req.body, outputDir);
        const scriptPath = path.join(SCRIPTS_DIR, 'generate_cert.sh');
        const command = `bash "${scriptPath}" ${args}`;
        
        console.log('执行命令:', command);
        
        // 执行脚本
        await executeScript(command);
        
        // 验证生成的文件
        const files = await validateGeneratedFiles(outputDir);
        
        console.log('证书生成成功，文件列表:', files);
        
        return {
            id: certificateId,
            message: '证书生成成功',
            files: files
        };
        
    } catch (error) {
        console.error('证书生成失败:', error);
        
        // 清理失败的输出目录
        try {
            await fs.remove(outputDir);
        } catch (cleanupError) {
            console.error('清理目录失败:', cleanupError);
        }
        
        throw error;
    } finally {
        // 从正在处理的请求集合中移除
        processingRequests.delete(certificateId);
    }
}

// 证书下载API
app.get('/api/download-certificate/:id', async (req, res) => {
    const certificateId = req.params.id;
    const outputDir = path.join(TEMP_DIR, certificateId);
    
    try {
        console.log('开始下载证书，ID:', certificateId);
        
        // 检查证书ID格式
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(certificateId)) {
            return res.status(400).json({
                success: false,
                message: '无效的证书ID'
            });
        }
        
        // 检查是否正在处理中
        if (processingRequests.has(certificateId)) {
            return res.status(423).json({
                success: false,
                message: '证书正在生成中，请稍后再试'
            });
        }
        
        // 检查目录是否存在
        if (!await fs.pathExists(outputDir)) {
            return res.status(404).json({
                success: false,
                message: '证书不存在或已过期'
            });
        }
        
        // 验证文件完整性
        const files = await validateGeneratedFiles(outputDir);
        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: '证书文件不存在或损坏'
            });
        }
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="ssl-certificate-${certificateId}.zip"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        // 创建ZIP流
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        let archiveErrorOccurred = false;
        
        archive.on('error', (err) => {
            console.error('ZIP创建错误:', err);
            archiveErrorOccurred = true;
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'ZIP文件创建失败'
                });
            }
        });
        
        // 处理客户端断开连接
        req.on('close', () => {
            if (!archiveErrorOccurred) {
                console.log('客户端断开连接，取消下载:', certificateId);
                archive.abort();
            }
        });
        
        // 将ZIP流管道到响应
        archive.pipe(res);
        
        // 添加目录中的所有文件到ZIP
        archive.directory(outputDir, false);
        
        // 完成ZIP
        await archive.finalize();
        
        console.log('证书下载完成，ID:', certificateId);
        
        // 延迟清理文件（给下载一些时间）
        setTimeout(async () => {
            try {
                // 再次检查是否正在处理，避免删除正在使用的文件
                if (!processingRequests.has(certificateId)) {
                    await fs.remove(outputDir);
                    console.log('临时文件已清理:', certificateId);
                }
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
        }, 60000); // 1分钟后清理
        
    } catch (error) {
        console.error('下载失败:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: '下载失败'
            });
        }
    }
});

// 健康检查API
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SSL证书生成器运行正常',
        timestamp: new Date().toISOString()
    });
});

// 队列状态查询API
app.get('/api/queue-status', (req, res) => {
    res.json({
        success: true,
        currentProcessing: currentRequests,
        queueLength: requestQueue.length,
        maxConcurrent: MAX_CONCURRENT_REQUESTS,
        maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE,
        maxTempDirs: MAX_TEMP_DIRS,
        isAcceptingRequests: currentRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length < 10
    });
});

// 构建脚本参数
function buildScriptArgs(params, outputDir) {
    const args = [];
    
    // 必须的输出目录参数
    args.push(`--output-dir="${outputDir}"`);
    
    // 可选参数
    if (params.domain) {
        args.push(`--domain="${params.domain}"`);
    }
    
    if (params.certName) {
        args.push(`--cert-name="${params.certName}"`);
    }
    
    if (params.wildcardDomain) {
        args.push(`--wildcard-domain="${params.wildcardDomain}"`);
    }
    
    if (params.ips) {
        args.push(`--ips="${params.ips}"`);
    }
    
    if (params.caName) {
        args.push(`--ca-name="${params.caName}"`);
    }
    
    if (params.caOrg) {
        args.push(`--ca-org="${params.caOrg}"`);
    }
    
    if (params.caUnit) {
        args.push(`--ca-unit="${params.caUnit}"`);
    }
    
    if (params.sslSize) {
        args.push(`--ssl-size="${params.sslSize}"`);
    }
    
    if (params.sslDate) {
        args.push(`--ssl-date="${params.sslDate}"`);
    }
    
    if (params.country) {
        args.push(`--country="${params.country}"`);
    }
    
    return args.join(' ');
}

// 执行脚本
function executeScript(command) {
    return new Promise((resolve, reject) => {
        exec(command, { 
            cwd: SCRIPTS_DIR,
            timeout: 30000, // 30秒超时
            maxBuffer: 1024 * 1024 // 1MB buffer
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('脚本执行错误:', error);
                console.error('stderr:', stderr);
                reject(new Error(`脚本执行失败: ${error.message}`));
                return;
            }
            
            if (stderr) {
                console.warn('脚本警告:', stderr);
            }
            
            console.log('脚本输出:', stdout);
            resolve(stdout);
        });
    });
}

// 验证生成的文件
async function validateGeneratedFiles(outputDir) {
    const expectedFiles = [
        'ca-cert.pem',
        'ca-key.pem',
        'server-cert.pem',
        'server-key.pem',
        'fullchain.pem',
        'openssl.cnf'
    ];
    
    const files = [];
    
    for (const filename of expectedFiles) {
        const filePath = path.join(outputDir, filename);
        if (await fs.pathExists(filePath)) {
            const stats = await fs.stat(filePath);
            files.push({
                name: filename,
                size: stats.size,
                created: stats.birthtime
            });
        }
    }
    
    if (files.length === 0) {
        throw new Error('没有生成任何证书文件');
    }
    
    // 至少要有证书和私钥文件
    const hasServerCert = files.some(f => f.name === 'server-cert.pem');
    const hasServerKey = files.some(f => f.name === 'server-key.pem');
    const hasCACert = files.some(f => f.name === 'ca-cert.pem');
    
    if (!hasServerCert || !hasServerKey || !hasCACert) {
        throw new Error('关键证书文件生成失败');
    }
    
    return files;
}

// 定期清理过期的临时文件
setInterval(async () => {
    try {
        const tempDirs = await fs.readdir(TEMP_DIR);
        const now = Date.now();
        const maxAge = 1 * 60 * 60 * 1000; // 1小时
        let cleanedCount = 0;
        
        for (const dir of tempDirs) {
            const dirPath = path.join(TEMP_DIR, dir);
            
            try {
                const stats = await fs.stat(dirPath);
                
                // 检查是否为目录且过期
                if (stats.isDirectory() && (now - stats.birthtime.getTime()) > maxAge) {
                    // 检查是否正在处理中
                    if (!processingRequests.has(dir)) {
                        await fs.remove(dirPath);
                        cleanedCount++;
                        console.log('清理过期临时目录:', dir);
                    } else {
                        console.log('跳过正在处理的目录:', dir);
                    }
                }
            } catch (statError) {
                // 文件可能已被删除或不可访问
                console.warn('无法访问目录:', dir, statError.message);
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`定期清理完成，清理了 ${cleanedCount} 个过期目录`);
        }
        
        // 清理过期的请求计数器
        const currentMinute = Math.floor(now / 60000);
        for (const [key, value] of requestCounts.entries()) {
            if (Math.floor(value.timestamp / 60000) < currentMinute - 5) {
                requestCounts.delete(key);
            }
        }
        
    } catch (error) {
        console.error('清理临时文件失败:', error);
    }
}, 30 * 60 * 1000); // 每30分钟清理一次

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╭──────────────────────────────────────────────────────────────╮
│                    SSL证书生成器服务                        │
│                                                              │
│  🚀 服务器已启动                                             │
│  📍 地址: http://localhost:${PORT}                           │
│  📁 临时目录: ${TEMP_DIR}                              │
│  📜 脚本目录: ${SCRIPTS_DIR}                          │
│                                                              │
│  🔧 API接口:                                                 │
│    POST /api/generate-certificate - 生成证书                │
│    GET  /api/download-certificate/:id - 下载证书            │
│    GET  /api/health - 健康检查                               │
│                                                              │
│  ⚙️  并发控制:                                               │
│    最大并发数: ${MAX_CONCURRENT_REQUESTS}                                       │
│    每分钟限制: ${MAX_REQUESTS_PER_MINUTE}                                      │
│    最大临时目录: ${MAX_TEMP_DIRS}                                     │
│                                                              │
╰──────────────────────────────────────────────────────────────╯
    `);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    process.exit(0);
});

module.exports = app;