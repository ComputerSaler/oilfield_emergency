# 数智应急指挥平台 · PC 后台原型

Vue3 + Vite + Ant Design Vue 4.x 原型工程。视觉规范全部取自客户现有系统
**AIRIOT 4.x（`172.17.0.68`「数智应急指挥平台」）** 的实测计算样式，量取环境 1920×1080。

## 启动

```bash
npm install
npm run dev     # http://127.0.0.1:5180/
```

> 端口固定 5180 且绑定 **IPv4 `127.0.0.1`**。本机系统代理（`127.0.0.1:7897`）会拦截
> IPv6 回环，若用 Vite 默认的 `localhost`（可能解析到 `::1`）会出现"无法访问该网站"。

## 页面

| 路由 | 说明 |
|---|---|
| `#/style-guide` | **设计规范总览**：色板 / 字体 / 间距 / 圆角 / 全部基础组件示例。评审入口，不在业务菜单里 |
| `#/system/region` | 区域管理。**视觉基准页（golden page）**，新列表页照此派生 |
| `#/system/user` | 用户管理。左侧部门树 + 右侧查询表格双栏 |
| `#/business/gps-monitor` | GPS 实时监控。地图 + 右侧 368px 面板 |

未实现的菜单项统一落到占位空态页，点击不会白屏。

## 改样式只碰三个地方

| 文件 | 职责 |
|---|---|
| `src/styles/tokens.scss` | **唯一色值/尺寸来源**，全部为 CSS 变量 |
| `src/theme/index.ts` | Token → Ant Design Vue（`darkAlgorithm` + 组件级覆写） |
| `src/styles/global.scss` | antd 类名兜底覆写（Token 覆盖不到的部分） |
| `src/config/design-tokens.ts` | 规范页的 Token 清单，含「实测/派生」标记 |

**业务页面禁止硬编码色值**，一律用 `var(--of-*)`。改 `tokens.scss` 时同步
`design-tokens.ts`（规范页展示用），两者是一一对应关系。

## 关键实测值

主色 `#1481A6`（青蓝，非 antd 默认）· 顶栏 52px `#1E262F` · 侧栏 256px `#1C2630`（折叠 48px）
· 卡片 `#18222B` · 表头 `#223647`/55px · 行高 65px · 控件 32px · 全局圆角 4px（antd v5 默认 6px 已覆写）

## 待确认的派生值（8 项）

现有系统业务页按钮是低代码 `div` 自绘，**不具备 hover 态**；成功/警告色在系统中从未出现。
以下按 Ant Design 算法推导，规范页用橙色「派生」徽标标出，**确认后方可定稿**：

| Token | 取值 | 说明 |
|---|---|---|
| `--of-color-primary-hover` | `#2A9CC2` | 主色提亮 |
| `--of-color-primary-active` | `#0F6683` | 主色压暗 |
| `--of-color-link-hover` | `#7FD4FA` | 链接提亮 |
| `--of-bg-btn-default-hover` | `#4C5B6C` | 次级按钮提亮 |
| `--of-color-success` | `#52C41A` | antd 默认 |
| `--of-color-warning` | `#FAAD14` | antd 默认 |
| `--of-spacing-6` | `32px` | 大区块留白 |
| `--of-transition-base` | `.2s` | 过渡曲线 |

另两项需业务确认：原系统藏了原生滚动条（实测宽 0），原型补了 6px 细滚动条以保证长列表可用性；
顶栏标题用商用字体 `AlimamaShuHeiTi-Bold`（原系统从平台文件服务加载），已做系统字体兜底，
正式交付前需确认授权。

## 新增页面三步

1. 复制 `src/views/system/RegionList.vue`，改数据源与列定义
2. `src/config/navigation.ts` 加菜单项
3. `src/router/index.ts` 加路由 —— **`name` 必须与菜单 `key` 一致**，`meta.module` 指向顶栏模块

## 校验脚本

```bash
node ../build/verify_proto.js    # 原型 vs 现有系统 12 项基准 + 5 档断点
node ../build/shoot_guide.js     # 规范页渲染校验 + 截图
node ../build/shoot_pages.js     # 三个业务页截图
```

现状：12/12 项一致，1920/1600/1366/1280/1024 五档均无横向溢出，控制台 0 报错。

## 已知事项

- 生产包单 chunk 1.5MB（gzip 481KB）。原型阶段可接受，正式项目需 `manualChunks` 拆分
- `theme/index.ts` 的 `components` 块做了一次类型断言：ant-design-vue 4.2.6 的
  `ThemeConfig` 类型未收录各组件 component token（`headerBg`/`darkItemBg` 等），但运行时生效
- 跨组件复用类型放 `src/types/ui.ts` —— 自动引入的组件无法跨文件解析其内部 `export interface`
