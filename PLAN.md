# KinSight — GitHub Demo 完整规划

> 基于现有 Web MVP，补齐功能 + 代码重构，交付可分享的 GitHub 项目

---

## 一、最终功能清单

### 核心识别
- [x] 摄像头实时人脸检测 + 框叠加
- [x] 已知人脸自动识别 + 浏览器通知
- [x] 陌生人截图 + 手动注册（姓名/关系/备注）
- [x] 防刷屏通知（同人 15 秒内不重复）

### 访客记录（新增）
- [ ] 每次识别/陌生人到访都记入时间线
- [ ] 时间线列表：头像 + 姓名 + 时间 + 关系/陌生人标记
- [ ] 陌生人记录：陌生人来访也保留截图和时间
- [ ] 人员详情：点击一个人查看他/她的所有来访记录

### 人员管理（新增）
- [ ] 编辑已注册人员（修改姓名/关系/备注）
- [ ] 搜索人员（按姓名或关系过滤）
- [ ] 人员列表视图（卡片/列表切换）

### 数据管理（新增）
- [ ] JSON 导出（备份全部数据）
- [ ] JSON 导入（恢复数据）

### 家庭树（重构）
- [ ] 按辈分层级排列（祖辈 → 父辈 → 同辈 → 子辈）
- [ ] 交互式：可拖拽、缩放、点击查看详情
- [ ] 样式优化：连线 + 头像 + 名称

### 统计面板（新增）
- [ ] 总来访次数
- [ ] 今日来访
- [ ] 来访排行（谁来得最多）
- [ ] 来访时段分布

### 体验优化
- [ ] 模型加载显示具体进度
- [ ] 通知权限友好请求
- [ ] 空状态引导文案
- [ ] 中/英文界面切换
- [ ] 响应式布局优化

---

## 二、数据模型升级

当前只用了一个 `visitors` 数组，需要改为两个数据源：

```
visitors (已注册亲属)
├── id, name, relation, note, image, descriptor, createdAt

visits (访问记录，新增)
├── id, personId (nullable), timestamp, image, confidence, type
│   type: 'recognized' | 'stranger' | 'registered'
│   personId = null 表示陌生人
```

这样设计后：
- 统计面板 = `visits` 按时间/人员聚合
- 人员详情 = 过滤 `visits` 查某个 `personId`
- 陌生人记录 = 过滤 `visits` 查 `personId == null`
- 删除人员时保留陌生人部分的访问记录

---

## 三、辈分推导规则

根据关系自动推导辈分层级：

| 辈分 | 关系 |
|------|------|
| 祖辈 (-2) | 爷爷、奶奶、外公、外婆 |
| 父辈 (-1) | 爸爸、妈妈、伯父、伯母、叔叔、婶婶、姑姑、姑父、舅舅、舅妈、姨妈、姨父 |
| 同辈 (0) | 哥哥、姐姐、弟弟、妹妹、堂哥、堂姐、堂弟、堂妹、表哥、表姐、表弟、表妹 |
| 子辈 (+1) | 儿子、女儿、侄子、侄女、外甥、外甥女 |

家庭树按此纵向排列，每行一个辈分，连线展示层级关系。

---

## 四、项目结构

```
src/
├── main.jsx                     # 入口
├── App.jsx                      # 路由/选项卡 + 全局状态
├── App.css                      # 全局样式
│
├── components/
│   ├── Header.jsx               # 顶部导航 + 语言切换
│   ├── CameraView.jsx           # 摄像头预览 + 人脸框
│   ├── MonitorPanel.jsx         # 实时监控面板（摄像头+识别结果）
│   ├── RecognizeAlert.jsx       # 识别结果提示条
│   ├── RegisterForm.jsx         # 陌生人标记表单
│   ├── VisitTimeline.jsx        # 访客时间线列表
│   ├── PersonDetail.jsx         # 人员详情 + 来访记录
│   ├── PersonList.jsx           # 人员管理列表（搜索+编辑+删除）
│   ├── FamilyTree.jsx           # 亲属图谱（辈分树 + 交互）
│   ├── Statistics.jsx           # 统计面板
│   ├── DataManager.jsx          # 导入/导出面板
│   └── Settings.jsx             # 设置面板
│
├── hooks/
│   ├── useFaceRecognition.js    # 人脸模型加载 + 定时扫描
│   ├── useLocalStorage.js       # 通用 localStorage 读写
│   └── useNotification.js       # 通知权限 + 发送封装
│
├── utils/
│   ├── relations.js             # 关系选项 + 辈分 + 分组
│   ├── constants.js             # 阈值/存储 key 等常量
│   ├── storage.js               # 数据读写（visitors + visits）
│   └── i18n.js                  # 中英文字典
│
└── styles/
    ├── variables.css            # CSS 变量
    ├── layout.css               # 布局样式
    ├── components.css           # 组件样式
    └── tree.css                 # 家庭树专用样式
```

---

## 五、实现顺序（5 个 Phase）

### Phase 1：基础设施 + 代码拆分
- git 初始化、.gitignore、LICENSE
- 按上述结构拆分组件和样式
- i18n 中英文框架
- **可运行验证点：`npm run dev` 正常，功能不变**

### Phase 2：访客记录系统
- 新增 `visits` 数据模型 + storage 封装
- VisitTimeline 组件（按时间倒序展示所有访问）
- 识别/陌生人/注册时自动写入 visit 记录
- PersonDetail 组件（点击人员查看其来访记录）
- 陌生人记录标签页
- **可运行验证点：每次识别后能在时间线看到记录**

### Phase 3：人员管理
- PersonList 组件（卡片/列表切换，搜索过滤）
- 编辑人员（弹出编辑表单）
- 删除人员（二次确认，保留陌生人 visit）
- **可运行验证点：能搜索、编辑、删除人员**

### Phase 4：家庭树重构 + 统计
- 按辈分推导公式实现分层级树
- CSS 层级树布局（祖辈→父辈→同辈→子辈）
- 交互功能：点击展开详情、缩放/拖拽
- Statistics 面板：聚合 visits 数据展示图表
- **可运行验证点：树按辈分排列，统计数字正确**

### Phase 5：数据管理 + 收尾
- DataManager 导入/导出 JSON
- 模型加载进度显示
- README 重写（含截图）
- 最终验证 + commit
- **可运行验证点：导出 → 清除 → 导入，数据恢复正确**

---

## 六、不纳入范围

- ❌ 不加 TypeScript（保持 JS）
- ❌ 不加测试
- ❌ 不换 face-api.js 库
- ❌ 不加后端/数据库
- ❌ 不加 CI/CD

---

## 七、预期目录结构

```
KinSight/
├── .gitignore
├── LICENSE
├── README.md
├── index.html
├── package.json
├── vite.config.js
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── components/   (10 个组件)
    ├── hooks/         (3 个 hooks)
    ├── utils/         (4 个模块)
    └── styles/        (4 个 CSS 文件)
```
