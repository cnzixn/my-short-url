import { connectToDatabase } from '../utils/db';
import { nanoid } from 'nanoid';

// 短链生成配置
const KEY_LENGTH = 6;
const MAX_RETRIES = 3;

export async function handler(event) {
  const requestId = event.headers['x-nf-request-id'] || 'local-dev';
  console.log(`[${requestId}] 开始处理请求`);

  // 验证请求方法
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // 检查请求体
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '请求体不能为空' })
    };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的JSON格式' })
    };
  }

  // 验证URL参数
  const { url } = parsedBody;
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '缺少URL参数' })
    };
  }

  // 验证URL格式
  try {
    new URL(url); // 使用内置URL验证
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: '无效的URL格式',
        validExample: 'https://example.com'
      })
    };
  }

  let client;
  try {
    // 连接数据库
    const { db, client: dbClient } = await connectToDatabase();
    client = dbClient;

    // 检查现有记录
    const existingLink = await db.collection('links').findOne({ url });
    if (existingLink) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: existingLink.key,
          existing: true 
        })
      };
    }

    // 生成唯一短码
    let key;
    let retries = 0;
    let inserted = false;

    while (retries < MAX_RETRIES && !inserted) {
      key = nanoid(KEY_LENGTH);
      
      try {
        await db.collection('links').insertOne({
          key,
          url,
          createdAt: new Date(),
          clicks: 0
        });
        inserted = true;
      } catch (error) {
        if (error.code === 11000) { // MongoDB重复键错误
          retries++;
          if (retries >= MAX_RETRIES) {
            throw new Error('无法生成唯一短码，请重试');
          }
          continue;
        }
        throw error;
      }
    }

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    };

  } catch (error) {
    console.error(`[${requestId}] 数据库操作失败:`, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && {
          detail: error.message
        })
      })
    };
  } finally {
    // 确保关闭数据库连接
    if (client && client.isConnected()) {
      await client.close();
    }
  }
}