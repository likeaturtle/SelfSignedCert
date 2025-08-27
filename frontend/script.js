// SSL证书生成器前端脚本
class SSLCertGenerator {
    constructor() {
        this.queuePollingInterval = null;
        this.init();
        // 保存实例到全局变量以便清理
        window.sslCertGenerator = this;
    }

    init() {
        this.bindEvents();
        this.setupForm();
        this.initCustomSelects(); // 初始化自定义下拉菜单
        this.checkServerStatus();
    }

    bindEvents() {
        const form = document.getElementById('certForm');
        const resetBtn = document.getElementById('resetBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const newCertBtn = document.getElementById('newCertBtn');

        form.addEventListener('submit', this.handleFormSubmit.bind(this));
        resetBtn.addEventListener('click', this.resetForm.bind(this));
        downloadBtn.addEventListener('click', this.downloadCertificate.bind(this));
        newCertBtn.addEventListener('click', this.showForm.bind(this));
    }

    setupForm() {
        // 自动补全证书名称
        const domainInput = document.getElementById('domain');
        const certNameInput = document.getElementById('certName');
        
        domainInput.addEventListener('input', (e) => {
            if (!certNameInput.value) {
                certNameInput.placeholder = e.target.value || '留空则使用主域名';
            }
        });
    }

    // 初始化自定义下拉菜单
    initCustomSelects() {
        const customSelects = document.querySelectorAll('.custom-select');
        
        customSelects.forEach(select => {
            const trigger = select.querySelector('.select-trigger');
            const options = select.querySelector('.select-options');
            const hiddenInput = select.parentElement.querySelector('input[type="hidden"]');
            const selectText = select.querySelector('.select-text');
            
            // 点击触发器切换下拉菜单
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSelect(select);
            });
            
            // 点击选项
            options.addEventListener('click', (e) => {
                if (e.target.classList.contains('select-option')) {
                    const value = e.target.getAttribute('data-value');
                    const text = e.target.textContent;
                    
                    // 更新选中状态
                    options.querySelectorAll('.select-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    e.target.classList.add('active');
                    
                    // 更新显示文本和隐藏输入框值
                    selectText.textContent = text;
                    if (hiddenInput) {
                        hiddenInput.value = value;
                    }
                    
                    // 关闭下拉菜单
                    this.closeAllSelects();
                    
                    // 触发变更事件
                    hiddenInput.dispatchEvent(new Event('change'));
                }
            });
        });
        
        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeAllSelects();
        });
        
        // 键盘事件支持
        document.addEventListener('keydown', (e) => {
            const openSelect = document.querySelector('.custom-select.open');
            if (openSelect) {
                if (e.key === 'Escape') {
                    this.closeAllSelects();
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateOptions(openSelect, e.key === 'ArrowDown');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const highlighted = openSelect.querySelector('.select-option.highlighted');
                    if (highlighted) {
                        highlighted.click();
                    }
                }
            }
        });
    }
    
    // 切换下拉菜单开关
    toggleSelect(select) {
        const isOpen = select.classList.contains('open');
        this.closeAllSelects();
        
        if (!isOpen) {
            select.classList.add('open');
            // 聚焦到当前选中的选项
            const activeOption = select.querySelector('.select-option.active');
            if (activeOption) {
                activeOption.classList.add('highlighted');
            }
        }
    }
    
    // 关闭所有下拉菜单
    closeAllSelects() {
        document.querySelectorAll('.custom-select').forEach(select => {
            select.classList.remove('open');
            select.querySelectorAll('.select-option').forEach(option => {
                option.classList.remove('highlighted');
            });
        });
    }
    
    // 箭头键导航选项
    navigateOptions(select, isDown) {
        const options = select.querySelectorAll('.select-option');
        const highlighted = select.querySelector('.select-option.highlighted');
        
        let newIndex = 0;
        if (highlighted) {
            const currentIndex = Array.from(options).indexOf(highlighted);
            newIndex = isDown ? 
                Math.min(currentIndex + 1, options.length - 1) : 
                Math.max(currentIndex - 1, 0);
            highlighted.classList.remove('highlighted');
        }
        
        options[newIndex].classList.add('highlighted');
        options[newIndex].scrollIntoView({ block: 'nearest' });
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const generateBtn = document.getElementById('generateBtn');
        const btnText = generateBtn.querySelector('.btn-text');
        const btnLoader = generateBtn.querySelector('.btn-loader');

        try {
            // 显示加载状态
            this.setLoadingState(true);
            
            // 收集表单数据
            const formData = this.collectFormData();
            
            // 验证表单数据
            if (!this.validateFormData(formData)) {
                return;
            }

            // 发送请求到后端
            const response = await fetch('/api/generate-certificate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            // 处理队列状态（202状态码）
            if (response.status === 202 && result.queued) {
                this.handleQueuedRequest(result);
                return;
            }

            if (!response.ok) {
                throw new Error(result.message || '证书生成失败');
            }

            // 显示成功结果
            this.showResult(result);
            this.showNotification('证书生成成功！', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message || '证书生成失败，请重试', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    collectFormData() {
        const form = document.getElementById('certForm');
        const formData = new FormData(form);
        const data = {};

        // 将FormData转换为普通对象，过滤空值
        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                data[key] = value.trim();
            }
        }

        // 为CA配置项设置默认值
        if (!data.caName) {
            data.caName = 'ACENova CA';
        }
        if (!data.caOrg) {
            data.caOrg = 'ACENova';
        }
        if (!data.caUnit) {
            data.caUnit = 'ACENova Department';
        }
        if (!data.country) {
            data.country = 'CN';
        }
        
        // 为有效期设置默认值
        if (!data.sslDate) {
            data.sslDate = '365';
        }

        return data;
    }

    validateFormData(data) {
        // 基本验证
        if (!data.domain) {
            this.showNotification('请填写主域名', 'error');
            document.getElementById('domain').focus();
            return false;
        }

        // 验证域名格式
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(data.domain)) {
            this.showNotification('域名格式不正确', 'error');
            document.getElementById('domain').focus();
            return false;
        }

        // 验证IP地址格式（如果填写）
        if (data.ips) {
            const ips = data.ips.split(',').map(ip => ip.trim());
            const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            
            for (const ip of ips) {
                if (ip && !ipRegex.test(ip)) {
                    this.showNotification(`IP地址格式不正确: ${ip}`, 'error');
                    document.getElementById('ips').focus();
                    return false;
                }
            }
        }

        // 验证国家代码
        if (data.country && data.country.length !== 2) {
            this.showNotification('国家代码必须是2位字母', 'error');
            document.getElementById('country').focus();
            return false;
        }

        // 验证证书有效期
        if (data.sslDate) {
            const days = parseInt(data.sslDate);
            if (isNaN(days) || days < 1 || days > 36500) {
                this.showNotification('证书有效期必须在1-36500天之间', 'error');
                document.getElementById('sslDate').focus();
                return false;
            }
        }

        return true;
    }

    setLoadingState(loading) {
        const generateBtn = document.getElementById('generateBtn');
        const btnText = generateBtn.querySelector('.btn-text');
        const btnLoader = generateBtn.querySelector('.btn-loader');

        if (loading) {
            generateBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
        } else {
            generateBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    showResult(result) {
        const formContainer = document.querySelector('.form-container');
        const resultContainer = document.getElementById('resultContainer');
        
        // 存储生成ID用于下载
        this.certificateId = result.id;
        
        // 隐藏表单，显示结果
        formContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        
        // 移除自动滚动，避免刷新后不必要的滚动
        // window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showForm() {
        const formContainer = document.querySelector('.form-container');
        const resultContainer = document.getElementById('resultContainer');
        
        // 显示表单，隐藏结果
        formContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        
        // 移除自动滚动，避免刷新后不必要的滚动
        // window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async downloadCertificate() {
        if (!this.certificateId) {
            this.showNotification('没有可下载的证书', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/download-certificate/${this.certificateId}`);
            
            if (!response.ok) {
                throw new Error('下载失败');
            }

            // 创建下载链接
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ssl-certificate-${this.certificateId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showNotification('证书下载成功！', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('下载失败，请重试', 'error');
        }
    }

    resetForm() {
        const form = document.getElementById('certForm');
        form.reset();
        
        // 重置占位符
        document.getElementById('certName').placeholder = '留空则使用主域名';
        
        // 重置自定义下拉菜单
        const customSelects = document.querySelectorAll('.custom-select');
        customSelects.forEach(select => {
            const options = select.querySelectorAll('.select-option');
            const selectText = select.querySelector('.select-text');
            const hiddenInput = select.parentElement.querySelector('input[type="hidden"]');
            
            // 移除所有active状态
            options.forEach(opt => opt.classList.remove('active'));
            
            // 设置默认选项（第一个选项）
            const defaultOption = options[0];
            if (defaultOption) {
                defaultOption.classList.add('active');
                selectText.textContent = defaultOption.textContent;
                if (hiddenInput) {
                    hiddenInput.value = defaultOption.getAttribute('data-value');
                }
            }
        });
        
        // 移除自动滚动，避免刷新后不必要的滚动
        // window.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.showNotification('表单已重置', 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icon = notification.querySelector('.notification-icon');
        const text = notification.querySelector('.notification-text');

        // 设置图标
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        icon.textContent = icons[type] || icons.info;
        text.textContent = message;

        // 设置样式类
        notification.className = `notification ${type}`;

        // 显示通知
        notification.classList.add('show');

        // 2秒后自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }

    // 实用方法：格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 实用方法：复制到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('已复制到剪贴板', 'success');
        } catch (err) {
            console.error('复制失败:', err);
            this.showNotification('复制失败', 'error');
        }
    }

    // 检查服务器状态
    async checkServerStatus() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                const data = await response.json();
                console.log('服务器状态:', data);
                // 可以在界面上显示服务器状态指示器
                this.updateServerStatus(true);
            } else {
                this.updateServerStatus(false);
            }
        } catch (error) {
            console.error('服务器状态检查失败:', error);
            this.updateServerStatus(false);
        }
    }

    // 更新服务器状态指示器
    updateServerStatus(isOnline) {
        // 在页面标题右侧添加状态指示器
        const logoH1 = document.querySelector('.logo h1');
        let statusIndicator = document.querySelector('.server-status');
        
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.className = 'server-status';
            // 将状态指示器插入到h1后面
            logoH1.parentNode.insertBefore(statusIndicator, logoH1.nextSibling);
        }
        
        if (isOnline) {
            statusIndicator.innerHTML = '<span class="status-dot"></span><span class="status-text">服务正常</span>';
            statusIndicator.className = 'server-status online';
        } else {
            statusIndicator.innerHTML = '<span class="status-dot"></span><span class="status-text">服务异常</span>';
            statusIndicator.className = 'server-status offline';
        }
    }

    // 处理队列请求
    handleQueuedRequest(result) {
        const queueInfo = {
            position: result.queuePosition,
            estimatedWaitTime: result.estimatedWaitTime,
            currentProcessing: result.currentProcessing,
            maxConcurrent: result.maxConcurrent
        };
        
        // 显示队列提示
        this.showQueueNotification(queueInfo);
        
        // 启动队列状态轮询
        this.startQueuePolling();
    }
    
    // 显示队列通知
    showQueueNotification(queueInfo) {
        const message = `服务器繁忙，您的请求已加入队列
队列位置: 第 ${queueInfo.position} 位
当前处理: ${queueInfo.currentProcessing}/${queueInfo.maxConcurrent}
预计等待: ${queueInfo.estimatedWaitTime} 秒`;
        
        this.showCustomNotification(message, 'warning', 8000); // 8秒显示
        
        // 在表单上方显示队列状态
        this.showQueueStatus(queueInfo);
    }
    
    // 显示队列状态
    showQueueStatus(queueInfo) {
        const formContainer = document.querySelector('.form-container');
        let queueStatusDiv = document.querySelector('.queue-status');
        
        if (!queueStatusDiv) {
            queueStatusDiv = document.createElement('div');
            queueStatusDiv.className = 'queue-status';
            formContainer.insertBefore(queueStatusDiv, formContainer.firstChild);
        }
        
        queueStatusDiv.innerHTML = `
            <div class="queue-status-content">
                <div class="queue-icon">⏳</div>
                <div class="queue-info">
                    <h3>请求已加入队列</h3>
                    <p>队列位置: 第 <strong>${queueInfo.position}</strong> 位</p>
                    <p>当前处理: <strong>${queueInfo.currentProcessing}/${queueInfo.maxConcurrent}</strong> 个任务</p>
                    <p>预计等待: <strong>${queueInfo.estimatedWaitTime}</strong> 秒</p>
                </div>
                <button class="queue-close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="queue-progress">
                <div class="queue-progress-bar"></div>
            </div>
        `;
        
        queueStatusDiv.style.display = 'block';
    }
    
    // 启动队列状态轮询
    startQueuePolling() {
        if (this.queuePollingInterval) {
            clearInterval(this.queuePollingInterval);
        }
        
        this.queuePollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/queue-status');
                if (response.ok) {
                    const status = await response.json();
                    this.updateQueueStatus(status);
                    
                    // 如果队列为空且没有处理中的请求，停止轮询
                    if (status.queueLength === 0 && status.currentProcessing === 0) {
                        this.stopQueuePolling();
                        this.hideQueueStatus();
                    }
                }
            } catch (error) {
                console.error('队列状态检查失败:', error);
            }
        }, 2000); // 每2秒检查一次
    }
    
    // 停止队列轮询
    stopQueuePolling() {
        if (this.queuePollingInterval) {
            clearInterval(this.queuePollingInterval);
            this.queuePollingInterval = null;
        }
    }
    
    // 更新队列状态
    updateQueueStatus(status) {
        const queueStatusDiv = document.querySelector('.queue-status');
        if (queueStatusDiv && queueStatusDiv.style.display !== 'none') {
            const queueInfo = queueStatusDiv.querySelector('.queue-info');
            if (queueInfo) {
                queueInfo.innerHTML = `
                    <h3>请求处理中...</h3>
                    <p>当前处理: <strong>${status.currentProcessing}/${status.maxConcurrent}</strong> 个任务</p>
                    <p>队列长度: <strong>${status.queueLength}</strong> 个等待</p>
                `;
            }
        }
    }
    
    // 隐藏队列状态
    hideQueueStatus() {
        const queueStatusDiv = document.querySelector('.queue-status');
        if (queueStatusDiv) {
            queueStatusDiv.style.display = 'none';
        }
    }
    
    // 自定义通知
    showCustomNotification(message, type = 'info', duration = 2000) {
        const notification = document.getElementById('notification');
        const icon = notification.querySelector('.notification-icon');
        const text = notification.querySelector('.notification-text');

        // 设置图标
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        icon.textContent = icons[type] || icons.info;
        text.innerHTML = message.replace(/\n/g, '<br>'); // 支持换行

        // 设置样式类
        notification.className = `notification ${type}`;

        // 显示通知
        notification.classList.add('show');

        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 禁用浏览器默认的滚动恢复行为，避免刷新后自动滚动
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    
    new SSLCertGenerator();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    const generator = window.sslCertGenerator;
    if (generator && generator.queuePollingInterval) {
        generator.stopQueuePolling();
    }
});

// 添加一些增强的用户体验功能
document.addEventListener('DOMContentLoaded', () => {
    // 平滑滚动增强
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 表单字段焦点增强
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });

    // 键盘快捷键支持
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter 提交表单
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const form = document.getElementById('certForm');
            if (form.style.display !== 'none') {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape 键重置表单或返回表单
        if (e.key === 'Escape') {
            const resultContainer = document.getElementById('resultContainer');
            if (resultContainer.style.display !== 'none') {
                document.getElementById('newCertBtn').click();
            }
        }
    });
});