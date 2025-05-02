import { connectToDatabase } from '../utils/db';
import { customAlphabet } from 'nanoid';
import { URL } from 'url';

// 配置常量
const CONFIG = {
  KEY_LENGTH: 6,
  MAX_RETRIES: 3,
  CUSTOM_CHARS: 'abcdefghijklmnopqrstuvwxyz0123456789',
  MAX_BATCH_SIZE: 100 // 限制批量处理的最大数量
};

const generateKey = customAlphabet(CONFIG.CUSTOM_CHARS, CONFIG.KEY_LENGTH);

/**
 * 验证URL格式
 * @param {string} url - 要验证的URL
 * @returns {boolean} 是否有效
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function handler(event) {
  // 方法检查
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // 请求体检查
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '请求体不能为空' }),
    };
  }

  // JSON解析
  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的JSON格式' }),
    };
  }

  // 批量数据检查
  const batch = parsed.batch;
  if (!Array.isArray(batch) || batch.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'batch 应为非空数组' }),
    };
  }

  // 限制批量处理大小
  if (batch.length > CONFIG.MAX_BATCH_SIZE) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: `批量处理数量超过限制 (最大 ${CONFIG.MAX_BATCH_SIZE})` 
      }),
    };
  }

  // 数据库连接
  const { db, client } = await connectToDatabase();
  const links = db.collection('links');
  const results = [];
  const bulkOps = []; // 批量操作

  try {
    for (const [index, item] of batch.entries()) {
      const originalUrl = item.url?.trim();
      let customKey = item.key?.trim();

      // URL 校验
      if (!originalUrl) {
        results.push({ index, error: 'URL不能为空' });
        continue;
      }

      if (!isValidUrl(originalUrl)) {
        results.push({ index, url: originalUrl, error: '无效的URL格式，必须包含http://或https://' });
        continue;
      }

      // 检查是否已存在相同 URL
      const existing = await links.findOne({ url: originalUrl });
      if (existing) {
        results.push({ 
          index,
          url: originalUrl, 
          key: existing.key, 
          existing: true 
        });
        continue;
      }

      // 处理自定义key
      if (customKey) {
        // 验证自定义key格式
        if (!/^[a-z0-9]+$/i.test(customKey)) {
          results.push({ 
            index,
            url: originalUrl, 
            error: '自定义短链只能包含字母和数字' 
          });
          continue;
        }

        if (customKey.length > CONFIG.KEY_LENGTH * 2) {
          results.push({ 
            index,
            url: originalUrl, 
            error: `自定义短链过长 (最大 ${CONFIG.KEY_LENGTH * 2} 字符)` 
          });
          continue;
        }

        const conflict = await links.findOne({ key: customKey });
        if (conflict) {
          results.push({ 
            index,
            url: originalUrl, 
            key: customKey, 
            error: '自定义短链已存在' 
          });
          continue;
        }

        // 添加到批量操作
        bulkOps.push({
          insertOne: {
            document: {
              key: customKey,
              url: originalUrl,
              createdAt: new Date(),
              clicks: 0,
            }
          }
        });

        results.push({ 
          index,
          url: originalUrl, 
          key: customKey 
        });
        continue;
      }

      // 自动生成key
      let retries = 0;
      let inserted = false;
      let autoKey;

      while (retries < CONFIG.MAX_RETRIES && !inserted) {
        autoKey = generateKey();
        try {
          // 添加到批量操作
          bulkOps.push({
            insertOne: {
              document: {
                key: autoKey,
                url: originalUrl,
                createdAt: new Date(),
                clicks: 0,
              }
            }
          });

          inserted = true;
          results.push({ 
            index,
            url: originalUrl, 
            key: autoKey 
          });
        } catch (err) {
          if (err.code === 11000) { // 重复键错误
            retries++;
          } else {
            throw err;
          }
        }
      }

      if (!inserted) {
        results.push({ 
          index,
          url: originalUrl, 
          error: '生成短链失败，请重试' 
        });
      }
    }

    // 执行批量操作
    if (bulkOps.length > 0) {
      await links.bulkWrite(bulkOps, { ordered: false });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        results 
      }),
    };
  } catch (err) {
    console.error('数据库操作失败:', err);
    return {
      statusCode: err.code === 11000 ? 409 : 500,
      body: JSON.stringify({ 
        error: err.code === 11000 ? '短链冲突，请重试' : '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  } finally {
    await client.close();
  }
}
