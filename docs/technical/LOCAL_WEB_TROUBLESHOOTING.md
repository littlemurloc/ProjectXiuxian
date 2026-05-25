# 本地网页打不开排障指南

本文用于后续每次修改网页原型后，快速处理 `http://127.0.0.1:4173/` 打不开的问题，避免重复排查。

## 适用场景

- 应用内浏览器显示无法访问 `127.0.0.1:4173`。
- 页面之前能打开，修改代码或重启后突然打不开。
- `/health` 不返回 `ok`。
- 端口看起来有 Node 进程，但浏览器仍然连不上。

## 当前项目服务约定

- 启动命令：`node server.js`
- 默认地址：`http://127.0.0.1:4173/`
- 健康检查：`http://127.0.0.1:4173/health`
- 健康检查成功返回：`ok`
- 入口文件：`index.html`
- 脚本加载顺序：先 `src/data.js`，再 `game.js`

## 快速恢复流程

### 1. 先检查服务是否还活着

在项目根目录运行：

```powershell
try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/health).Content } catch { $_.Exception.Message }
```

判断：

- 返回 `ok`：服务活着，继续检查首页和脚本资源。
- 返回“无法连接到远程服务器”：服务没有稳定监听，需要重新启动。

### 2. 检查端口是否监听

```powershell
netstat -ano | Select-String ':4173'
```

判断：

- 出现 `LISTENING`：端口正在监听。
- 没有输出：服务没有起来，或启动后被回收。

### 3. 稳定启动服务

如果普通后台启动后马上失效，优先用沙盒外启动方式。

推荐命令：

```powershell
Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'server.js' -WorkingDirectory 'D:\Codex\project02' -WindowStyle Hidden
```

注意：

- 在 Codex 沙盒内用 `Start-Process node server.js` 有时只在当前命令生命周期内短暂可用，命令结束后服务可能被回收。
- 如果健康检查出现“刚返回 `ok`，下一秒首页又打不开”，基本就是服务没有持久化。
- 这时应申请沙盒外执行启动命令，让浏览器可以持续访问服务。

### 4. 启动后验证首页和资源

```powershell
try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/; "index status=$($r.StatusCode) len=$($r.Content.Length)" } catch { $_.Exception.Message }
```

```powershell
try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/src/data.js; "data status=$($r.StatusCode) len=$($r.Content.Length)" } catch { $_.Exception.Message }
```

```powershell
try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/game.js; "game status=$($r.StatusCode) len=$($r.Content.Length)" } catch { $_.Exception.Message }
```

判断：

- 首页返回 `status=200`。
- `src/data.js` 返回 `status=200`。
- `game.js` 返回 `status=200`。

以上三项都通过后，刷新应用内浏览器页面。

## 改动网页后的标准检查

每次修改 `index.html`、`src/data.js`、`game.js`、`styles.css` 或 `server.js` 后，至少运行：

```powershell
npm test
```

当前 `smoke-test.js` 会检查：

- 必要文件存在。
- DOM 挂载点存在。
- `src/data.js` 数据表存在。
- 至少 2 个职业、6 个法宝、24 个升级、6 个装备位、12 件装备、6 个事件。
- `game.js` 和 `src/data.js` 语法有效。
- 最小 DOM/canvas 环境下脚本能启动，并能推进一次试炼。

## 常见问题与处理

### 有 Node 进程但网页打不开

可能原因：

- 这个 Node 进程不是 `server.js`。
- `server.js` 进程已经退出，但还有其他 Node 进程残留。
- 端口 `4173` 没有监听。

处理：

```powershell
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,StartTime
netstat -ano | Select-String ':4173'
```

只看 Node 进程不够，必须看 `4173` 是否 `LISTENING`。

### 健康检查成功，但首页下一次请求失败

可能原因：

- 服务进程被沙盒回收。
- 后台启动方式不持久。

处理：

- 使用沙盒外启动。
- 再连续检查 `/health`、首页和脚本资源。

### 应用内浏览器自动化不能刷新本地页

Browser 自动化可能因为安全策略拒绝访问本地 URL。此时不要绕过策略。

处理：

- 用 PowerShell 验证服务和资源。
- 告知用户手动刷新应用内浏览器。

### 页面打开但功能异常

先运行：

```powershell
npm test
```

如果测试通过但页面仍异常，优先检查浏览器控制台或最近改动的：

- `index.html` 脚本顺序是否仍为 `src/data.js` 在前、`game.js` 在后。
- `src/data.js` 是否暴露 `window.GAME_DATA`。
- `game.js` 是否依赖了不存在的 DOM id。
- 新增按钮是否绑定了事件监听。

## 最短应急命令组

当只想快速恢复页面时，按顺序执行：

```powershell
npm test
```

```powershell
Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'server.js' -WorkingDirectory 'D:\Codex\project02' -WindowStyle Hidden
```

```powershell
try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/health).Content } catch { $_.Exception.Message }
```

```powershell
try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/; "index status=$($r.StatusCode) len=$($r.Content.Length)" } catch { $_.Exception.Message }
```

看到 `ok` 和 `index status=200` 后，刷新浏览器。
