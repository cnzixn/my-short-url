import { connectToDatabase } from '../utils/db';

exports.handler = async (event) => {
  try {
    // 解析请求体
    const { url } = JSON.parse(event.body);
    
    if (!url) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "缺少URL参数" }) 
      };
    }

    // 验证URL格式
    if (!/^https?:\/\//i.test(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "无效的URL格式，需包含http/https协议头" })
      };
    }

    // 连接数据库
    const { db, client } = await connectToDatabase();
    
    try {
      // 检查重复URL
      const existing = await db.collection('links').findOne({ url });
      if (existing) {
        return {
          statusCode: 200,
          body: JSON.stringify({ key: existing.key })
        };
      }

      // 生成唯一key
      const { nanoid } = await import('nanoid');
      const key = nanoid(6);

      // 写入数据库
      await db.collection('links').insertOne({
        key,
        url,
        createdAt: new Date(),
        clicks: 0
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      };
    } finally {
      client.close();
    }

  } catch (error) {
    console.error('完整错误堆栈:', error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "服务器内部错误",
        detail: process.env.NODE_ENV === 'development' ? error.message : null
      })
    };
  }
};
