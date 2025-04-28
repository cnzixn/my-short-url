import { connectToDatabase } from '../utils/db';
import QRCode from 'qrcode';

const MOBILE_REGEX = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i;

export async function handler(event) {
  // 记录请求ID用于追踪
  const requestId = event.headers['x-nf-request-id'] || 'local-dev';
  console.log(`[${requestId}] 开始处理请求`);

  let client;

  try {
    const segments = event.path.split('/').filter(Boolean); // 移除空字符串
    const key = segments[segments.length - 1]; // 最后一个才是 jNVxbx
    console.log(`[${requestId}] 短码: ${key}`);

    // 连接数据库
    const { db, client: dbClient } = await connectToDatabase();
    client = dbClient;
    console.log(`[${requestId}] 数据库已连接`);

    // 查询数据库
    const collection = db.collection('links');
    const doc = await collection.findOne({ key });
    if (!doc) {
      console.log(`[${requestId}] 未找到对应记录`);
      return { statusCode: 404, body: JSON.stringify({ error: "未找到短链" }) };
    }

    // 设备检测
    const userAgent = event.headers['user-agent'] || '';
    const isMobile = MOBILE_REGEX.test(userAgent);
    console.log(`[${requestId}] 设备类型: ${isMobile ? '移动端' : '桌面端'}`);

    // 移动端跳转
    if (isMobile) {
      console.log(`[${requestId}] 重定向至: ${doc.url}`);
      return {
        statusCode: 302,
        headers: { Location: doc.url }
      };
    }

    // 桌面端生成二维码
    try {
      // 检查 URL 是否有协议头
      if (!/^https?:\/\//i.test(doc.url)) {
        throw new Error("URL缺少协议头");
      }

      // 生成二维码
      const qr = await QRCode.toDataURL(doc.url);
      console.log(`[${requestId}] 二维码生成成功`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <h1>扫描访问</h1>
          <img src="${qr}" width="200" alt="QR Code">
          <p>原始链接：<a href="${doc.url}">${doc.url}</a></p>
        `
      };
    } catch (qrError) {
      console.error(`[${requestId}] 二维码生成失败:`, qrError.stack);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html' },
        body: `<p>无法生成二维码，请直接访问：<a href="${doc.url}">${doc.url}</a></p>`
      };
    }

  } catch (err) {
    console.error(`[${requestId}] 全局错误:`, err.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: "INTERNAL_SERVER_ERROR",
        requestId,
        timestamp: new Date().toISOString(),
        details: err.message
      })
    };
  } finally {
    // 确保关闭数据库连接
    if (client) {
      try {
        await client.close();
        console.log(`[${requestId}] 数据库连接已关闭`);
      } catch (closeError) {
        console.error(`[${requestId}] 关闭数据库连接失败:`, closeError.stack);
      }
    }
  }
}