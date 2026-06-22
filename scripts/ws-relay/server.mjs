/**
 * @file server.mjs
 * @description WS 中转 + 发送页托管（两台手机保底方案）。手机A(传感器,浏览器)→ 本服务 → 安卓 App(wsSensorSource)。
 *   单端口同时：GET / 返回发送页 ws-sender.html；WS 升级 → 把任一连接收到的消息广播给其它连接（中转）。
 *
 * 运行（Mac，与手机同一 WiFi）：
 *   npm i ws            # 仅首次
 *   node scripts/ws-relay/server.mjs
 * iPhone 当传感器需 HTTPS（iOS 强制）：另开一窗 `ngrok http 8787`，iPhone 打开 ngrok 给的 https 地址。
 * 安卓 App 是原生，可直接用 ws://<mac内网IP>:8787（无需 HTTPS）。
 */
import http from 'node:http';
import os from 'node:os';
import {readFileSync} from 'node:fs';
import {WebSocketServer} from 'ws';

const PORT = Number(process.env.PORT || 8787);
const html = readFileSync(new URL('./ws-sender.html', import.meta.url));

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(html);
});

const wss = new WebSocketServer({server});
wss.on('connection', ws => {
  ws.on('message', data => {
    const msg = data.toString();
    for (const c of wss.clients) {
      if (c !== ws && c.readyState === 1) {
        c.send(msg);
      }
    }
  });
});

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
  console.log(`✓ WS 中转 + 发送页 已启动，端口 ${PORT}`);
  console.log('安卓 App 连接地址（Settings 里填，同 WiFi）：');
  ips.forEach(ip => console.log(`    ws://${ip}:${PORT}`));
  console.log('iPhone 传感器页（iOS 必须 HTTPS）：另开 `ngrok http ' + PORT + '`，用它给的 https 地址打开。');
});
