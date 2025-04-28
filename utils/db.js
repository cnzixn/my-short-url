import { MongoClient } from 'mongodb';

let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // 连接池大小
    minPoolSize: 2
  });

  await client.connect();
  const db = client.db('shortener'); // 数据库名
  
  // 创建索引（仅首次部署时执行）
  await db.collection('links').createIndex({ key: 1 }, { unique: true });
  await db.collection('links').createIndex({ url: 1 });

  cachedDb = { client, db };
  return cachedDb;
}
