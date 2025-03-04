import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

/**
 * 地址管理器类，用于管理智能钱包地址
 */
export class AddressManager extends EventEmitter {
    private addresses: string[] = [];
    private envPath: string;
    
    constructor() {
        super();
        this.envPath = path.resolve(process.cwd(), '.env');
        this.loadAddresses();
    }

    /**
     * 加载地址列表
     */
    private loadAddresses(): void {
        try {
            const envConfig = dotenv.parse(fs.readFileSync(this.envPath));
            if (envConfig.SMART_MONEY_ADDRESSES) {
                this.addresses = envConfig.SMART_MONEY_ADDRESSES.split(',').filter(Boolean);
            }
        } catch (error) {
            console.error('加载地址失败:', error);
            this.addresses = [];
        }
    }

    /**
     * 获取所有地址
     */
    getAddresses(): string[] {
        return [...this.addresses];
    }

    /**
     * 添加新地址
     */
    addAddress(address: string): boolean {
        // 验证地址格式
        if (!this.isValidAddress(address)) {
            return false;
        }

        // 检查地址是否已存在
        if (this.addresses.includes(address)) {
            return false;
        }

        // 添加新地址
        this.addresses.push(address);
        this.saveAddresses();
        
        // 触发地址更新事件
        this.emit('addressesUpdated', this.addresses);
        return true;
    }

    /**
     * 删除地址
     */
    removeAddress(address: string): boolean {
        const index = this.addresses.indexOf(address);
        if (index === -1) {
            return false;
        }

        this.addresses.splice(index, 1);
        this.saveAddresses();
        
        // 触发地址更新事件
        this.emit('addressesUpdated', this.addresses);
        return true;
    }

    /**
     * 更新地址
     */
    updateAddress(oldAddress: string, newAddress: string): boolean {
        // 验证新地址格式
        if (!this.isValidAddress(newAddress)) {
            return false;
        }

        const index = this.addresses.indexOf(oldAddress);
        if (index === -1) {
            return false;
        }

        // 检查新地址是否已存在
        if (oldAddress !== newAddress && this.addresses.includes(newAddress)) {
            return false;
        }

        this.addresses[index] = newAddress;
        this.saveAddresses();
        
        // 触发地址更新事件
        this.emit('addressesUpdated', this.addresses);
        return true;
    }

    /**
     * 保存地址到.env文件
     */
    private saveAddresses(): void {
        try {
            const envContent = fs.readFileSync(this.envPath, 'utf8');
            const updatedContent = envContent.replace(
                /SMART_MONEY_ADDRESSES=.*/,
                `SMART_MONEY_ADDRESSES=${this.addresses.join(',')}`
            );
            
            fs.writeFileSync(this.envPath, updatedContent);
        } catch (error) {
            console.error('保存地址失败:', error);
        }
    }

    /**
     * 验证地址格式
     */
    private isValidAddress(address: string): boolean {
        // Solana地址通常是base58编码的44个字符
        // 这里做一个简单的验证，实际应用中可能需要更严格的验证
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
}

// 创建单例实例
export const addressManager = new AddressManager();
