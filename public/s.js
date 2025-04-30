
const getPathKey = () => {
    const segments = window.location.pathname.split('/').filter(Boolean);
    return segments.length > 1 ? segments[1] : null;
};

const showMsg = (message) => {
    const sTipText = document.getElementById('sTipText');
    sTipText.textContent = message;
};

const init = async () => {
    const key = getPathKey();
    if (!key) {
        showMsg('无效链接地址');
        return;
    }

    try {
        // console.log('[DEBUG] 开始获取短链接:', key);

        const response = await fetch('/.netlify/functions/getLink', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Key': key
            },
            body: JSON.stringify({ key })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`服务响应异常: ${response.status} ${errorText.slice(0, 50)}`);
        }

        const data = await response.json().catch(e => {
            throw new Error('数据格式错误');
        });

        // console.log('[DEBUG] 接收数据:', data);

        // 移动端直接跳转
        const isMobile = /(iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone)/i.test(navigator.userAgent);
        if (isMobile) {
            // console.log('[DEBUG] 移动端跳转至:', data.url);
            window.location.href = data.url;
            return;
        }

        // 桌面端显示二维码
        // console.log('[DEBUG] 桌面端渲染二维码');

        const sContent = document.getElementById('sContent');
        const sImageDiv = document.getElementById('sImage');
        const sTargetLink = document.getElementById('sTargetLink');

        if (!sContent || !sImageDiv || !sTargetLink) {
            console.error('[CRITICAL] 关键元素未找到');
            return;
        }

        // 填充二维码图片
        const img = document.createElement('img');
        img.width = 300;
        img.alt = "二维码";
        if (data.qrCode.startsWith('data:image/')) {
            img.src = data.qrCode; // Base64直接用
        } else {
            img.src = data.qrCode + '?t=' + Date.now(); // 普通URL加时间戳防缓存
        }
        sImageDiv.appendChild(img);

        // 填充链接
        sTargetLink.href = data.url;
        sTargetLink.innerHTML = data.url;
        sTargetLink.style.display = 'none';

        // 显示内容
        sContent.style.display = 'block';
        showMsg('请打开手机扫码');
        //document.getElementById('sTipText').style.display = 'none';

    } catch (error) {
        console.error('[ERROR] 完整错误链:', error);

        const errorMap = {
            404: () => `${key}链接不存在`,
            500: () => '服务暂时不可用',
            '网络错误': () => '网络连接失败',
            '数据格式错误': () => '服务器响应异常'
        };

        const getMessage = () => {
            if (error.message.includes('404')) return errorMap[404]();
            if (error.message.includes('500')) return errorMap[500]();
            if (error.message.includes('Failed to fetch')) return errorMap['网络错误']();
            if (error.message.includes('数据格式错误')) return errorMap['数据格式错误']();
            return `${key}加载失败，错误代码：${error.message.slice(0, 30)}`;
        };

        showMsg(getMessage());

        if (!navigator.onLine) {
            showMsg('网络连接已断开');
        }
    }
};

init();