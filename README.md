# 数智应急指挥平台 - 产品原型与文档

尼日尔海外油田数智应急指挥平台的产品设计资料，包含交互原型与配套 PRD 文档。

## 目录结构

- **`prototype-app/`** - PC 后台交互原型（Vue3 + Ant Design Vue）
- **`prototype/`** - 产品需求文档（PRD）

## 快速开始

### 查看交互原型

```bash
cd prototype-app
npm install
npm run dev
# 访问 http://127.0.0.1:5180/
```

详细说明请查看 [`prototype-app/README.md`](./prototype-app/README.md)

### 查看产品文档

所有 PRD 文档位于 `prototype/` 目录，按模块命名：
- 人员管理系列
- 装备管理系列
- 实时监控中心系列
- 预警/事件管理系列
- 等

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
