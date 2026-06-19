# KinSight 人脸识别优化与远程监控设计文档

**日期**: 2024-06-19
**方案**: 方案 C - 混合方案
**状态**: 已批准

---

## 1. 概述

本文档描述 KinSight 人脸识别系统的优化和远程监控功能的实现方案。主要目标包括：

1. **提高人脸识别准确性和灵敏度**
2. **改进头像抓取质量**
3. **实现多重状态提醒系统**
4. **添加远程监控功能**

---

## 2. 人脸识别优化

### 2.1 扫描参数优化

| 参数 | 当前值 | 优化后 | 说明 |
|------|--------|--------|------|
| SCAN_INTERVAL_MS | 1400ms | 1000ms | 提高扫描频率 |
| MATCH_THRESHOLD | 0.48 | 0.45 | 降低阈值提高灵敏度 |
| LEARN_THRESHOLD | 0.55 | 0.52 | 更积极地学习新角度 |
| TinyFaceDetector inputSize | 320 | 416 | 更高的检测精度 |
| scoreThreshold | 0.5 | 0.4 | 检测更多人脸 |

### 2.2 智能头像抓取

**功能描述：**
- 在人脸检测框基础上增加 20% 边距，避免裁剪
- 确保人脸在抓取区域中心
- 使用更高 JPEG 质量（0.8 → 0.9）
- 边界检查：防止超出画面范围

### 2.3 多重状态系统

**状态类型：**

| 状态 | 触发条件 | 提醒方式 |
|------|----------|----------|
| 到达通知（Arrival） | 首次检测到人员 | 弹窗 + 声音 |
| 在场状态（Presence） | 人员持续在场 | 持续显示状态栏 |
| 持续提醒（Reminder） | 每隔 5 秒 | 轻量视觉提示 |
| 离开通知（Departure） | 人员离开后 | 弹窗通知 |

### 2.4 自适应匹配阈值

**功能描述：**
- 每个人员维护历史匹配置信度统计
- 根据历史准确率动态调整该人员的匹配阈值
- 高准确率人员使用更宽松阈值（0.42）
- 低准确率人员使用严格阈值（0.48）

---

## 3. 远程监控设计

### 3.1 架构概览

```
监控端（摄像头所在设备）
    ↓ WebSocket / MJPEG 流
局域网查看端（浏览器）
    ↓ WebRTC / 信令服务器
互联网查看端（手机/平板）
```

### 3.2 功能模块

**传输协议：**
- **局域网内**：WebSocket + MJPEG 视频流
- **互联网**：WebRTC P2P（可选）

**访问控制：**
- 生成 6 位数字访问码
- 访问码有效期 24 小时
- 支持生成新访问码作废旧码

**监控模式：**
- **实时流模式**：低延迟视频流
- **截图模式**：定期推送截图
- **混合模式**：实时流 + 截图存档

### 3.3 界面设计

**监控端新增：**
- 生成分享链接/访问码按钮
- 当前连接的查看端数量
- 访问历史记录

**查看端：**
- 访问码输入页面
- 实时监控画面
- 当前在场人员状态
- 访问记录

---

## 4. 技术实现

### 4.1 新增依赖

```json
{
  "socket.io": "^4.7.2",
  "socket.io-client": "^4.7.2"
}
```

### 4.2 文件结构

```
src/
├── components/
│   ├── RemoteMonitor.jsx        // 远程监控组件
│   ├── AccessCodeModal.jsx      // 访问码弹窗
│   └── PresenceIndicator.jsx    // 在场状态指示器
├── hooks/
│   ├── useSmartCapture.js       // 智能头像抓取
│   └── useRemoteStream.js       // 远程流管理
├── server/
│   └── index.js                 // WebSocket 服务器
└── utils/
    └── stream-utils.js          // 流处理工具
```

### 4.3 常量配置

**src/utils/constants.js 新增：**

```javascript
// 扫描优化
export const OPTIMIZED_SCAN_INTERVAL_MS = 1000;
export const OPTIMIZED_MATCH_THRESHOLD = 0.45;
export const OPTIMIZED_LEARN_THRESHOLD = 0.52;
export const FACE_DETECTION_INPUT_SIZE = 416;
export const FACE_DETECTION_SCORE_THRESHOLD = 0.4;

// 头像抓取
export const FACE_CAPTURE_PADDING_RATIO = 0.2;
export const FACE_CAPTURE_QUALITY = 0.9;

// 持续提醒
export const PRESENCE_REMINDER_INTERVAL_MS = 5000;
export const PRESENCE_REMINDER_TYPE = 'visual';

// 远程监控
export const REMOTE_STREAM_SERVER_PORT = 3001;
export const ACCESS_CODE_LENGTH = 6;
export const ACCESS_CODE_EXPIRY_HOURS = 24;
```

---

## 5. 实施计划

### 阶段 1：人脸识别优化
- [x] 优化扫描参数和检测配置
- [x] 实现智能头像抓取
- [x] 实现多重状态系统

### 阶段 2：远程监控基础
- [x] 搭建 WebSocket 服务器
- [x] 实现局域网 MJPEG 流传输
- [x] 实现访问码生成和验证

### 阶段 3：远程监控界面
- [x] 实现监控端分享功能
- [x] 实现查看端访问页面
- [x] 实现实时监控画面显示

### 阶段 4：测试和优化
- [ ] 测试识别准确性
- [ ] 测试远程监控稳定性
- [ ] 性能优化

---

## 6. 成功标准

1. 人脸识别准确率提升 20% 以上
2. 头像抓取完整率达到 95% 以上
3. 人员持续在场时状态稳定显示
4. 局域网内远程监控延迟小于 2 秒
5. 访问码系统安全可用

---

## 7. 风险和限制

1. WebSocket 服务器需要单独运行
2. 互联网访问需要端口转发或云服务器
3. 多设备同时查看会增加带宽占用
4. WebRTC 功能需要 STUN/TURN 服务器支持

---

## 8. 后续改进

1. 集成自适应阈值系统
2. 添加 WebRTC P2P 传输
3. 实现多摄像头支持
4. 添加移动端查看应用