import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import expressWs from 'express-ws';
import { addressManager } from '../address/addressManager';

/**
 * Web API服务类
 */
export class ApiServer {
    private app: any; // expressWs.Application
    private port: number;
    private wsClients: Set<any> = new Set();

    constructor(port: number = 3000) {
        this.port = port;
        const { app } = expressWs(express());
        this.app = app;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupAddressListener();
    }

    /**
     * 配置中间件
     */
    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(express.static('public'));
    }

    /**
     * 配置API路由
     */
    private setupRoutes(): void {
        // 获取所有地址
        this.app.get('/api/addresses', (req: express.Request, res: express.Response) => {
            res.json({ 
                success: true, 
                data: addressManager.getAddresses() 
            });
        });

        // 添加新地址
        this.app.post('/api/addresses', (req: express.Request, res: express.Response) => {
            const { address } = req.body;
            
            if (!address) {
                return res.status(400).json({ 
                    success: false, 
                    message: '地址不能为空' 
                });
            }

            const success = addressManager.addAddress(address);
            
            if (success) {
                return res.json({ 
                    success: true, 
                    message: '地址添加成功' 
                });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: '地址格式无效或已存在' 
                });
            }
        });

        // 删除地址
        this.app.delete('/api/addresses/:address', (req: express.Request, res: express.Response) => {
            const { address } = req.params;
            const success = addressManager.removeAddress(address);
            
            if (success) {
                return res.json({ 
                    success: true, 
                    message: '地址删除成功' 
                });
            } else {
                return res.status(404).json({ 
                    success: false, 
                    message: '地址不存在' 
                });
            }
        });

        // 更新地址
        this.app.put('/api/addresses/:oldAddress', (req: express.Request, res: express.Response) => {
            const { oldAddress } = req.params;
            const { newAddress } = req.body;
            
            if (!newAddress) {
                return res.status(400).json({ 
                    success: false, 
                    message: '新地址不能为空' 
                });
            }

            const success = addressManager.updateAddress(oldAddress, newAddress);
            
            if (success) {
                return res.json({ 
                    success: true, 
                    message: '地址更新成功' 
                });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: '地址更新失败，请检查地址格式或是否存在' 
                });
            }
        });
    }

    /**
     * 配置WebSocket
     */
    private setupWebSocket(): void {
        this.app.ws('/ws', (ws: any, req: express.Request) => {
            // 添加新的WebSocket客户端
            this.wsClients.add(ws);
            
            // 发送当前地址列表
            ws.send(JSON.stringify({
                type: 'addresses',
                data: addressManager.getAddresses()
            }));

            // 客户端断开连接时移除
            ws.on('close', () => {
                this.wsClients.delete(ws);
            });
        });
    }

    /**
     * 设置地址变更监听器
     */
    private setupAddressListener(): void {
        addressManager.on('addressesUpdated', (addresses: string[]) => {
            // 向所有WebSocket客户端广播地址更新
            this.broadcastAddresses(addresses);
        });
    }

    /**
     * 向所有WebSocket客户端广播地址更新
     */
    private broadcastAddresses(addresses: string[]): void {
        const message = JSON.stringify({
            type: 'addresses',
            data: addresses
        });

        this.wsClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }
    
    /**
     * 向所有WebSocket客户端广播交易数据
     */
    public broadcastTransaction(transactionData: any): void {
        const message = JSON.stringify({
            type: 'transaction',
            data: transactionData
        });

        this.wsClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }

    /**
     * 启动服务器
     */
    start(): void {
        this.app.listen(this.port, () => {
            console.log(`API服务器运行在 http://localhost:${this.port}`);
        });
    }
}

// 创建单例实例
export const apiServer = new ApiServer();
