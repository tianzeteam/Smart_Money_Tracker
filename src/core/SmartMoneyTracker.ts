import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import Client from '@triton-one/yellowstone-grpc';
import { TokenBalance, TransactionData, TokenInfo } from "../types/transaction";
import { WSOL_MINT } from "../config/constants";
import { formatTokenAmount } from "../utils/formatter";
import { formatTransactionOutput, TransactionLogData } from "../utils/logger";
import { createSubscribeRequest } from "../services/grpc/client";
import { EventEmitter } from "events";

export class SmartMoneyTracker extends EventEmitter {
    private client: Client;
    private connection: Connection;
    private addresses: string[];
    private watchedContracts: string[];
    private isTracking: boolean = false;
    private stream: any;

    constructor(
        client: Client,
        connection: Connection,
        addresses: string[],
        watchedContracts: string[]
    ) {
        super();
        this.client = client;
        this.connection = connection;
        this.addresses = addresses;
        this.watchedContracts = watchedContracts;
    }

    /**
     * 开始追踪交易
     */
    async startTracking() {
        if (this.isTracking) {
            console.log('已经在监控中，无需重复启动');
            return;
        }

        console.log('开始监控聪明钱包...');
        this.stream = await this.client.subscribe();
        console.log('GRPC 连接成功！');

        this.isTracking = true;
        const streamClosedPromise = this.setupStreamListeners(this.stream);
        await this.subscribeToTransactions(this.stream);
        
        // 当流关闭时，重置追踪状态
        streamClosedPromise.then(() => {
            this.isTracking = false;
            this.stream = null;
        }).catch(error => {
            console.error('流关闭出错:', error);
            this.isTracking = false;
            this.stream = null;
        });
    }

    /**
     * 更新监控地址列表
     * @param newAddresses 新的地址列表
     */
    async updateAddresses(newAddresses: string[]) {
        console.log('更新监控地址列表:', newAddresses);
        
        // 更新地址列表
        this.addresses = [...newAddresses];
        
        // 如果当前没有追踪，则不需要重启
        if (!this.isTracking) {
            console.log('地址已更新，追踪服务当前未运行');
            return;
        }
        
        // 停止当前追踪
        await this.stopTracking();
        
        // 等待一小段时间确保资源完全释放
        await new Promise<void>(resolve => setTimeout(resolve, 2000));
        
        // 重新启动追踪
        try {
            await this.startTracking();
            console.log('地址更新后追踪服务已重启');
        } catch (error) {
            console.error('启动追踪服务失败，尝试重新启动:', error);
            
            // 等待后再次尝试
            await new Promise<void>(resolve => setTimeout(resolve, 3000));
            
            try {
                await this.startTracking();
                console.log('重试启动追踪服务成功');
            } catch (retryError) {
                console.error('重试启动追踪服务仍然失败:', retryError);
            }
        }
    }
    
    /**
     * 停止追踪交易
     * @returns 如果成功停止返回true，否则返回false
     */
    async stopTracking(): Promise<boolean> {
        if (!this.isTracking || !this.stream) {
            console.log('当前没有进行追踪，无需停止');
            return false;
        }
        
        console.log('正在停止追踪...');
        
        // 关闭流 - 使用try-catch包裹以忽略取消错误
        try {
            this.stream.cancel();
        } catch (error) {
            // 忽略取消错误，这是预期的
            console.log('取消流时收到预期的错误，可以忽略');
        }
        
        // 等待一小段时间确保流关闭
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
        
        // 重置状态
        this.isTracking = false;
        this.stream = null;
        
        console.log('追踪已停止');
        return true;
    }

    private async setupStreamListeners(stream: any) {
        return new Promise<void>((resolve, reject) => {
            stream.on("error", (error: Error) => {
                // 检查是否是取消错误，如果是则不视为异常
                if (error.message && error.message.includes('CANCELLED')) {
                    console.log('流被取消，这是预期的行为');
                    resolve();
                } else {
                    console.error('流错误:', error);
                    reject(error);
                }
                
                try {
                    stream.end();
                } catch (endError) {
                    // 忽略关闭流时的错误
                }
            });
            
            stream.on("end", () => {
                console.log('流结束');
                resolve();
            });
            
            stream.on("close", () => {
                console.log('流关闭');
                resolve();
            });

            stream.on("data", async (data: TransactionData) => {
                if (data.transaction) {
                    const accountKeys = data.transaction.transaction.transaction.message.accountKeys.map((ak: Uint8Array) => bs58.encode(ak));
                    if (this.watchedContracts.some(contract => accountKeys.includes(contract))) {
                        await this.checkBalances(data);
                    }
                }
            });
        });
    }

    private async subscribeToTransactions(stream: any) {
        const request = createSubscribeRequest(this.addresses);
        await new Promise<void>((resolve, reject) => {
            stream.write(request, (err: Error | null | undefined) => {
                if (!err) resolve();
                else reject(err);
            });
        });
    }

    private async checkBalances(data: TransactionData): Promise<TokenInfo | null> {
        const solChange = this.calculateSolChange(data);
        const tokenInfo = await this.checkTokenBalances(data);
        if (!tokenInfo || tokenInfo.mint === WSOL_MINT) {
            return null;
        }

        // 创建交易日志数据
        const transactionData: TransactionLogData = {
            slot: data.transaction.slot,
            wallet: this.addresses[0],
            contract: this.watchedContracts.includes('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P') ? 'Pump' : 'Raydium',
            type: solChange < 0 ? '买入' : '卖出',
            tokenMint: tokenInfo.mint,
            solAmount: Math.abs(solChange),
            tokenAmount: Math.abs(tokenInfo.amount),
            timestamp: new Date().toISOString() // 添加时间戳
        };

        // 格式化输出并打印到控制台
        const output = formatTransactionOutput(transactionData);
        console.log(output);
        
        // 发射交易事件，传递交易数据
        this.emit('transaction', transactionData);
        
        return tokenInfo;
    }

    private calculateSolChange(data: TransactionData): number {
        const preBalance = data.transaction.transaction.meta.preBalances[0];
        const postBalance = data.transaction.transaction.meta.postBalances[0];
        return (postBalance - preBalance) / LAMPORTS_PER_SOL;
    }

    /**
     * 检查交易中的代币余额变化，并返回相关信息
     * @param data 交易数据
     * @returns 代币变化信息或null
     */
    private async checkTokenBalances(data: TransactionData) {
        // 从交易元数据中获取交易前的代币余额
        const preTokenBalances = data.transaction.transaction.meta.preTokenBalances;
        // 从交易元数据中获取交易后的代币余额
        const postTokenBalances = data.transaction.transaction.meta.postTokenBalances;

        // 如果交易后没有代币余额记录，则返回null
        if (postTokenBalances.length === 0) {
            return null;
        }

        // 遍历所有交易后的代币余额
        for (const postBalance of postTokenBalances) {
            // 如果代币所有者不在监控地址列表中，则跳过当前循环
            if (!this.addresses.includes(postBalance.owner)) continue;
            // 如果代币是WSOL，则跳过当前循环
            if (postBalance.mint === WSOL_MINT) continue;
            
            // 查找相同所有者和相同代币的交易前余额，如果找不到则默认为0
            const preBalance = preTokenBalances.find(
                (pre: TokenBalance) => pre.owner === postBalance.owner && pre.mint === postBalance.mint
            )?.uiTokenAmount.uiAmount || 0;
            
            // 计算代币余额变化量
            const change = postBalance.uiTokenAmount.uiAmount - preBalance;
            // 如果代币余额有变化，则返回代币信息和变化量
            if (change !== 0) {
                return {
                    mint: postBalance.mint,  // 代币的铸造地址
                    amount: change           // 代币数量变化
                };
            }
        }

        // 如果没有找到相关的代币变化，则返回null
        return null;
    }
} 