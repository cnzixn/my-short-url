import { MongoClient } from 'mongodb';

const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
};

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('缺少MONGODB_URI环境变量');
  }

  const client = new MongoClient(uri, connectionOptions);

  try {
    await client.connect();
    const db = client.db('shortener'); // 替换为实际数据库名
    return { db, client };
  } catch (error) {
    console.error('数据库连接失败:', error.stack);
    await client.close();
    throw error;
  }
}