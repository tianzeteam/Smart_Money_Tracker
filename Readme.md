# Smart Money Tracker (智能钱包追踪器)

一个用于追踪 Solana 链上"聪明钱包"交易行为的工具。实时监控指定钱包地址在 Raydium 和 Pump 上的交易活动。

## 功能特点

- 实时监控指定钱包地址的交易
- 追踪 Raydium 和 Pump 合约上的交易行为
- 自动过滤 wSOL 交易
- 计算每笔交易的 SOL 和代币变化
- 美化的控制台输出格式

## 安装
克隆项目
```bash
git clone https://github.com/vnxfsc/Smart_Money_Tracker.git
```
安装依赖
```bash
npm install
```

## 配置

在 `.env` 文件中配置 RPC 和 GRPC 的 endpoint。
```bash
RPC_ENDPOINT=你的Solana RPC节点地址
GRPC_ENDPOINT=GRPC服务地址
GRPC_OPTIONS={"grpc.max_receive_message_length":67108864}
SMART_MONEY_ADDRESSES=要追踪的钱包地址,多个地址用逗号分隔
```

## 运行
开发者模式运行
```bash
npm run dev
```
生产模式运行
```bash
npm start
```
## 输出示例
```bash
————————————————————————————
交易slot：12345
交易钱包：wallet_address
交易合约：Pump
交易类型：买入
代币地址：token_mint_address
SOL数量：1.23
代币数量：1,000.00
————————————————————————————
```
## 项目结构
```bash
smart-money-tracker/
├── .env                    # 环境变量配置文件
├── .env.example           # 环境变量模板文件
├── package.json           # 项目依赖和脚本配置
├── package-lock.json      # 依赖版本锁定文件
├── tsconfig.json          # TypeScript 配置
├── jest.config.js         # Jest 测试配置
├── README.md              # 项目说明文档
└── src/                   # 源代码目录
    ├── index.ts           # 项目入口文件
    ├── config/            # 配置文件目录
    │   ├── constants.ts   # 常量定义
    │   └── env.ts         # 环境变量处理
    │
    ├── core/              # 核心业务逻辑
    │   └── SmartMoneyTracker.ts  # 智能钱包追踪器核心类
    │
    ├── services/          # 外部服务集成
    │   ├── grpc/          # GRPC 服务
    │   │   ├── client.ts  # GRPC 客户端
    │   │   └── types.ts   # GRPC 类型定义
    │   └── solana/        # Solana 服务
    │       └── connection.ts  # Solana 连接管理
    │
    ├── types/             # 类型定义
    │   └── transaction.ts # 交易相关类型
    │
    ├── utils/             # 工具函数
    │   ├── error.ts       # 错误处理
    │   ├── formatter.ts   # 格式化工具
    │   └── logger.ts      # 日志工具
    │
    └── __tests__/         # 测试文件目录
        ├── core/          # 核心功能测试
        │   └── SmartMoneyTracker.test.ts
        ├── services/      # 服务测试
        │   ├── grpc/
        │   │   └── client.test.ts
        │   └── solana/
        │       └── connection.test.ts
        ├── utils/         # 工具函数测试
        │   ├── error.test.ts
        │   ├── formatter.test.ts
        │   └── logger.test.ts
        └── index.test.ts  # 入口文件测试
```
## 技术支持
- 交流群：[Buff社区](https://t.me/chainbuff)

## 免责声明
本项目仅供学习和研究 Solana 链上交易行为，不用于任何商业用途。请遵守当地法律法规，并注意保护个人隐私和数据安全。
