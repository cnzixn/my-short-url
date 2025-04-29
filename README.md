
git reset --hard 31b287a

作者：cnzixn@qq.com

你有任何的问题，都可以使用国内的各种 AI 工具解决。

以下过程，除了“注册域名”，全部免费白嫖。

------

# Cloudflare 注册域名

(可选)购买域名，这里价格低一些。.xyz 的 6+ 位数字的域名(123456.xyz)，目前 0.83美元/年。

-----

# MongoDB 数据存储

创建免费数据库，获取 MONGODB_URI 。

参考这个文章：https://twikoo.js.org/mongodb-atlas.html

-----

# GitHub 代码托管

克隆仓库到你的 GitHub 

以下代码设置短链“有效期”为 1 天，请修改或删除。
``` js
// utils/db.js
21    await db.collection('links').createIndex(
22      { createdAt: 1 },
23      { expireAfterSeconds: 1 * 24 * 60 * 60 }
24    );
```
-----

# Netlify 自动部署

  - Add new site
  - Import an existing project
  - 登录Git，授权
  - 选择仓库

### 部署参数

Build command
  npm install mongodb nanoid qrcode

Publish directory
  public

Functions directory
  functions

### 环境变量
  - MONGODB_URI="mongodb+srv://xxx:<pwd>@xxx.yyy.mongodb.net/?retryWrites=true&w=majority&appName=xxx"
  - ADMIN_PASSWORD="后台管理密码"

### 注册域名

这里的域名贵的吓死人，去别处购买吧。

-----


