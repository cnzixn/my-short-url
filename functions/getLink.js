import { connectToDatabase } from '../utils/db';
import QRCode from 'qrcode';

export async function handler(event) {
  // 允许CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // 预检请求处理
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    // 验证请求方法
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
        headers
      };
    }

    // 解析请求体
    const { key } = JSON.parse(event.body || '{}');
    if (!key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '缺少必要参数' }),
        headers
      };
    }

    // 连接数据库
    const { db, client } = await connectToDatabase();
    
    // 查询数据库
    const doc = await db.collection('links').findOne({ key });
    if (!doc) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '链接不存在' }),
        headers
      };
    }

    // 生成二维码
    const qrCode = await QRCode.toDataURL(doc.url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300
    });

    // 更新点击次数
    await db.collection('links').updateOne(
      { _id: doc._id },
      { $inc: { clicks: 1 } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: doc.url,
        qrCode,
        expiresAt: doc.createdAt.getTime() + 3*24*60*60*1000
      }),
      headers
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务器内部错误' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}
