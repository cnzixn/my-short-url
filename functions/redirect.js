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
    // 增强路径解析逻辑
    const pathSegments = event.path.split('/').filter(Boolean);
    const key = pathSegments[pathSegments.length - 1];
    
    if (!key || key === 's') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: '<h1>无效短码</h1>'
      };
    }

    // 数据库连接
    const { db, client: dbClient } = await connectToDatabase();
    client = dbClient;

    // 查询文档
    const collection = db.collection('links');
    const doc = await collection.findOne({ key });
    
    if (!doc) {
      console.log(`[${requestId}] 未找到记录`);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: '<h1>链接不存在</h1>'
      };
    }

    // 更新点击次数（原子操作）
    await collection.updateOne(
      { _id: doc._id },
      { $inc: { clicks: 1 } }
    );

    // 设备检测
    const isMobile = MOBILE_REGEX.test(event.headers['user-agent'] || '');

    // 移动端直接跳转
    if (isMobile) {
      return {
        statusCode: 302,
        headers: { 
          Location: doc.url,
          'Cache-Control': 'no-cache'
        }
      };
    }

    // 桌面端返回s.html模板
    const templatePath = join(process.cwd(), 'public', 's.html');
    let html = readFileSync(templatePath, 'utf8');

    // 生成二维码（带错误处理）
    let qrUrl;
    try {
      qrUrl = await QRCode.toDataURL(doc.url, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400
      });
    } catch (qrError) {
      console.error(`[${requestId}] 二维码生成失败:`, qrError);
      qrUrl = 'data:image/png;base64,...'; // 备用占位图
    }

    // 动态注入参数
    html = html
      .replace('{{TARGET_URL}}', doc.url)
      .replace('{{QR_CODE_URL}}', qrUrl)
      .replace('{{SHORT_KEY}}', key);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'max-age=60' // 短缓存
      },
      body: html
    };

  } catch (err) {
    console.error(`[${requestId}] 系统错误:`, err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "SERVER_ERROR",
        requestId,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    if (client) {
      await client.close();
      console.log(`[${requestId}] 释放数据库连接`);
    }
  }
}
