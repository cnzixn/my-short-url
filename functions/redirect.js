import { kv } from 'netlify-kv';
import QRCode from 'qrcode';

const MOBILE_REGEX = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i;

export async function handler(event) {
    const key = event.path.split('/')[1];
    const originalUrl = await kv.get(key);
    
    if (!originalUrl) return { statusCode: 404 };
    
    const isMobile = MOBILE_REGEX.test(event.headers['user-agent']);
    
    if (isMobile) {
        return {
            statusCode: 302,
            headers: { Location: originalUrl }
        };
    }
    
    // 生成二维码返回PC版页面
    const qr = await QRCode.toDataURL(originalUrl);
    
    return {
        statusCode: 200,
        headers: {'Content-Type': 'text/html'},
        body: `
            <h1>二维码访问</h1>
            <img src="${qr}" alt="QR Code">
            <p>原链接：<a href="${originalUrl}">${originalUrl}</a></p>
        `
    };
}
