import { ENV } from './config/env';
import { createGrpcClient } from './services/grpc/client';
import { createSolanaConnection } from './services/solana/connection';
import { SmartMoneyTracker } from './core/SmartMoneyTracker';
import { CONTRACTS } from './config/constants';
import { addressManager } from './services/address/addressManager';
import { apiServer } from './services/api/server';

/**
 * 应用程序主入口
 */
export async function main() {
    console.log('初始化智能钱包追踪器...');
    
    // 创建GRPC客户端和Solana连接
    const client = createGrpcClient();
    const connection = createSolanaConnection();

    // 创建追踪器实例
    const tracker = new SmartMoneyTracker(
        client,
        connection,
        ENV.SMART_MONEY_ADDRESSES,
        [CONTRACTS.PUMP, CONTRACTS.RAYDIUM]
    );

    // 设置地址更新监听器
    addressManager.on('addressesUpdated', async (addresses: string[]) => {
        console.log('地址列表已更新，正在应用到追踪器...');
        try {
            await tracker.updateAddresses(addresses);
            console.log('地址更新应用成功');
        } catch (error) {
            console.error('地址更新应用失败:', error);
        }
    });

    // 启动API服务器
    apiServer.start();
    console.log('Web管理界面已启动');
    
    // 设置交易事件监听器
    tracker.on('transaction', (transactionData) => {
        console.log('收到新交易，广播到前端...');
        apiServer.broadcastTransaction(transactionData);
    });

    // 开始追踪交易
    await tracker.startTracking();
}

// 启动应用程序
main().catch(error => {
    console.error('应用程序启动失败:', error);
    process.exit(1);
}); 