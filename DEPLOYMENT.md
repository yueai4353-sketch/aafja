# 部署说明

## 问题诊断

如果部署到网页后天气刷新功能不工作，可能是以下原因：

### 1. API路由问题
- 确保生产环境中后端服务器正在运行
- 前端的 `/api/weather` 请求需要正确路由到后端Express服务器

### 2. 网络连接问题
- 服务器需要能够访问外部API（wttr.in）
- 检查防火墙和网络策略是否允许出站HTTPS请求

### 3. CORS配置
- 如果前端和后端部署在不同域名，需要配置CORS
- 当前配置假设前后端在同一服务器上

## 正确的部署流程

### 1. 构建项目
```bash
npm run build
```

这会生成：
- `dist/` - 前端静态文件
- `dist/server.cjs` - 后端服务器

### 2. 启动生产服务器
```bash
NODE_ENV=production npm start
```

或直接运行：
```bash
NODE_ENV=production node dist/server.cjs
```

### 3. 验证部署
访问 `http://your-domain:3000` 并检查：
- [ ] 前端页面正常加载
- [ ] 打开浏览器开发者工具（F12）查看Console
- [ ] 点击天气页面的刷新按钮
- [ ] 查看Network标签，确认 `/api/weather` 请求返回200状态码
- [ ] 查看服务器日志，应该看到 `[Weather API]` 相关日志

## 调试步骤

### 查看服务器日志
所有天气API请求都会在服务器日志中输出：
```
[Weather API] Request received for city: 合肥
[Weather API] Fetching from wttr.in: https://wttr.in/...
[Weather API] wttr.in response status: 200
[Weather API] Successfully fetched weather data for: 合肥
```

### 查看浏览器Console
前端也会输出详细日志：
```
[WeatherApp] Fetching weather for: 合肥
[WeatherApp] Response status: 200
[WeatherApp] Received weather data
[WeatherApp] Weather data saved successfully
```

### 常见错误及解决方案

#### 错误1: "Failed to fetch" 或 "NetworkError"
**原因**: 无法连接到后端API
**解决**: 
- 确认后端服务器正在运行
- 检查端口3000是否被占用
- 如果使用反向代理，确认代理配置正确

#### 错误2: "The string did not match the expected pattern"
**原因**: 可能是请求返回了HTML而不是JSON（通常是路由配置问题）
**解决**: 
- 已修复：确保生产环境中API路由不会被SPA fallback捕获
- 服务器重启后应该解决

#### 错误3: "天气服务请求超时"
**原因**: 服务器无法访问wttr.in
**解决**: 
- 检查服务器的网络连接
- 确认防火墙允许HTTPS出站连接
- 尝试手动curl测试：`curl "https://wttr.in/Beijing?format=j1"`

#### 错误4: 404 错误
**原因**: API端点未找到
**解决**: 
- 确认使用的是 `dist/server.cjs` 而不是旧的server文件
- 重新构建项目：`npm run build`

## 环境变量

可选配置（用于AI聊天功能，不影响天气功能）：
```bash
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
```

## 端口配置

默认端口：3000

如需修改，编辑 `server.ts` 中的 `PORT` 变量，然后重新构建。

## 反向代理配置示例

### Nginx
```nginx
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 技术细节

### 修复内容
1. **服务器路由优化**: 确保API路由不被SPA fallback覆盖
2. **详细错误日志**: 添加完整的请求/响应日志
3. **超时处理**: API请求15秒超时保护
4. **数据验证**: 验证wttr.in返回的数据结构
5. **友好错误提示**: 前端显示具体的错误原因

### 文件修改
- `server.ts`: 优化路由、增强错误处理和日志
- `src/apps/WeatherApp.tsx`: 增强错误处理和日志输出
