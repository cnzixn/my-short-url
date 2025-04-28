import { connectToDatabase } from '../utils/db';
import QRCode from 'qrcode';
import { readFileSync } from 'fs';
import { join } from 'path';

const MOBILE_REGEX = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i;

export async function handler(event) {
  const requestId = event.headers['x-nf-request-id'] || 'local-dev';
  console.log(`[${requestId}] 开始处理请求`);

  let client;

  try {
    // 修正路径提取逻辑
    const segments = event.path.split('/').filter(Boolean);
    const key = segments[segments.length - 1];
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
      return {
        statusCode: 404,
        body: 'Not Found'
      };
    }

    // 更新点击次数，使用 $inc 操作符将 clicks 字段的值增加 1
    const updateResult = await collection.updateOne(
      { key },
      { $inc: { clicks: 1 } }
    );

    if (updateResult.modifiedCount === 0) {
      console.log(`[${requestId}] 更新点击次数失败`);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '更新点击次数失败' })
      };
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
      if (!/^https?:\/\//i.test(doc.url)) {
        throw new Error("URL缺少协议头");
      }
      const qr = await QRCode.toDataURL(doc.url);
      console.log(`[${requestId}] 二维码生成成功`);
      try {
          // 读取HTML模板文件
          const htmlPath = join(process.cwd(), 'public', 'qr.html');
          let htmlContent = readFileSync(htmlPath, 'utf8');
          // 替换占位符
          htmlContent = htmlContent.replace('QR_CODE_PLACEHOLDER', qr);
          return {
              statusCode: 200,
              headers: { 
                  'Content-Type': 'text/html; charset=utf-8',
                  'Cache-Control': 'no-cache' // 禁止缓存以保证动态内容
              },
              body: htmlContent
          };
      } catch (error) {
          console.error('Error loading template:', error);
          return {
              statusCode: 500,
              body: '无法加载页面'
          };
      }
    } catch (qrError) {
      console.error(`[${requestId}] 二维码生成失败:`, qrError);
      return {
        statusCode: 404,
        body: 'Not Found'
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
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    // 确保关闭数据库连接
    if (client) {
      await client.close();
      console.log(`[${requestId}] 数据库连接已关闭`);
    }
  }
}


                // <h1>扫描二维码访问链接</h1>
                // <img src="${qr}" width="200" alt="QR Code">
                // <p>原始链接：<a href="${doc.url}" target="_blank">${doc.url}</a></p>

                // <h1>二维码生成失败</h1>
                // <p>无法生成二维码，请直接访问：<a href="${doc.url}" target="_blank">${doc.url}</a></p>
                
                