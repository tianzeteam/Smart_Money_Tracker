import { formatTokenAmount } from './formatter';

export interface TransactionLogData {
    slot: number;
    wallet: string;
    contract: string;
    type: string;
    tokenMint: string;
    solAmount: number;
    tokenAmount: number;
    timestamp: string; // 时间戳字段
}

export function formatTransactionOutput(data: TransactionLogData): string {
    const lines = [
        '————————————————————————————',
        `交易槽位：${data.slot}`,
        `交易钱包：${data.wallet}`,
        `交易合约：${data.contract}`,
        `交易类型：${data.type}`,
        `代币地址：${data.tokenMint}`,
        `SOL数量：${formatTokenAmount(Math.abs(data.solAmount))}`,
        `代币数量：${formatTokenAmount(Math.abs(data.tokenAmount))}`,
        `交易时间：${new Date(data.timestamp).toLocaleString()}`,
        '————————————————————————————\n'
    ];
    
    return lines.join('\n');
} 