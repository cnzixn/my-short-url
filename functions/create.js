import { connectToDatabase } from '../utils/db';
import { customAlphabet } from 'nanoid';

const KEY_LENGTH = 6;
const MAX_RETRIES = 3;
const CUSTOM_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const generateKey = customAlphabet(CUSTOM_CHARS, KEY_LENGTH);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '请求体不能为空' }),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的JSON格式' }),
    };
  }

  const batch = parsed.batch;
  if (!Array.isArray(batch) || batch.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'batch 应为非空数组' }),
    };
  }

  const { db, client } = await connectToDatabase();
  const links = db.collection('links');
  const results = [];

  try {
    for (const item of batch) {
      const originalUrl = item.url?.trim();
      let customKey = item.key?.trim();

      // URL 校验
      try {
        new URL(originalUrl);
      } catch {
        results.push({ url: originalUrl, error: '无效的URL格式' });
        continue;
      }

      // 检查是否已存在相同 URL
      const existing = await links.findOne({ url: originalUrl });
      if (existing) {
        results.push({ url: originalUrl, key: existing.key, existing: true });
        continue;
      }

      // 如果有自定义 key，先尝试插入
      if (customKey) {
        const conflict = await links.findOne({ key: customKey });
        if (conflict) {
          results.push({ url: originalUrl, key: customKey, error: '自定义短链已存在' });
          continue;
        }

        await links.insertOne({
          key: customKey,
          url: originalUrl,
          createdAt: new Date(),
          clicks: 0,
        });

        results.push({ url: originalUrl, key: customKey });
        continue;
      }

      // 否则自动生成 key
      let retries = 0;
      let inserted = false;
      let autoKey;

      while (retries < MAX_RETRIES && !inserted) {
        autoKey = generateKey();
        try {
          await links.insertOne({
            key: autoKey,
            url: originalUrl,
            createdAt: new Date(),
            clicks: 0,
          });
          inserted = true;
          results.push({ url: originalUrl, key: autoKey });
        } catch (err) {
          if (err.code === 11000) {
            retries++;
          } else {
            throw err;
          }
        }
      }

      if (!inserted) {
        results.push({ url: originalUrl, error: '生成短链失败，请重试' });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    };
  } catch (err) {
    console.error('数据库操作失败:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务器内部错误' }),
    };
  } finally {
    await client.close();
  }
}