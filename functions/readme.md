 短链接服务 API 使用文档

 概述

本文档描述了短链接服务的 API 接口规范和使用方法。该服务提供短链接的创建、查询、更新、删除和重定向功能。

 基础信息

 请求地址
- 生产环境: `https://your-domain.com`
- 开发环境: `http://localhost:8888`

 响应格式
所有 API 响应均为 JSON 格式，包含以下字段：
- `statusCode`: HTTP 状态码
- `body`: 响应主体 (JSON 字符串)

 API 端点

 1. 创建短链接

Endpoint: `POST /api/links`

请求头:
Content-Type: application/json
Authorization: Bearer <token>   管理接口需要

请求体参数:
 参数  类型  必填  描述 

 url  string  是  原始长链接 
 key  string  否  自定义短码 (如不提供则自动生成) 

请求示例:
json
{
  "url": "https://example.com/very/long/url",
  "key": "custom123"
}

成功响应 (201):
json
{
  "url": "https://example.com/very/long/url",
  "key": "custom123",
  "shortUrl": "https://your-domain.com/l/custom123",
  "createdAt": "2023-01-01T00:00:00.000Z"
}

错误情况:
- 400: 请求参数无效
- 409: 短码已存在
- 500: 服务器内部错误

 2. 查询短链接信息

Endpoint: `GET /api/links?key=<short_key>`

请求示例:
GET /api/links?key=custom123

成功响应 (200):
json
{
  "key": "custom123",
  "url": "https://example.com/very/long/url",
  "clicks": 42,
  "createdAt": "2023-01-01T00:00:00.000Z"
}

错误情况:
- 404: 短链接不存在
- 500: 服务器内部错误

 3. 更新短链接目标

Endpoint: `PUT /api/links`

请求头:
Content-Type: application/json
Authorization: Bearer <token>   管理接口需要

请求体参数:
 参数  类型  必填  描述 

 key  string  是  短码 
 newUrl  string  是  新的目标URL 

请求示例:
json
{
  "key": "custom123",
  "newUrl": "https://example.com/new/url"
}

成功响应 (200):
json
{
  "key": "custom123",
  "url": "https://example.com/new/url",
  "message": "URL updated successfully"
}

错误情况:
- 400: 请求参数无效
- 404: 短链接不存在
- 500: 服务器内部错误

 4. 删除短链接

Endpoint: `DELETE /api/links?key=<short_key>`

请求头:
Authorization: Bearer <token>   管理接口需要

请求示例:
DELETE /api/links?key=custom123

成功响应 (200):
json
{
  "message": "Short link deleted successfully",
  "key": "custom123"
}

错误情况:
- 404: 短链接不存在
- 500: 服务器内部错误

 5. 重定向短链接

Endpoint: `GET /l/<short_key>`

请求示例:
GET /l/custom123

响应:
- 302: 重定向到目标URL
- 404: 短链接不存在

 管理认证

所有管理接口 (创建、更新、删除) 需要提供有效的 JWT token:

Authorization: Bearer <your_jwt_token>

 使用示例

 cURL 示例

1. 创建短链接:
bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{"url":"https://example.com"}' \
  https://your-domain.com/api/links

2. 查询短链接:
bash
curl "https://your-domain.com/api/links?key=abc123"

3. 重定向访问:
bash
curl -v "https://your-domain.com/l/abc123"

 JavaScript 示例

javascript
async function createShortLink(longUrl) {
  const response = await fetch('https://your-domain.com/api/links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your_token'
    },
    body: JSON.stringify({ url: longUrl })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create short link');
  }
  
  return await response.json();
}

// 使用示例
createShortLink('https://example.com')
  .then(data => console.log(data))
  .catch(err => console.error(err));

 错误代码

 状态码  描述 

 400  错误的请求参数 
 401  未授权 
 404  资源不存在 
 409  资源冲突 (如短码已存在) 
 500  服务器内部错误 

 注意事项

1. 所有管理操作需要认证
2. 短码只能包含字母和数字
3. 自动生成的短码长度为6-8个字符
4. 自定义短码最大长度为16个字符
5. 生产环境请启用HTTPS