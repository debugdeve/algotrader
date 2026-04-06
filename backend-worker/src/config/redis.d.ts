import IORedis from 'ioredis';
/**
 * Shared Redis connection configuration for BullMQ and status tracking.
 */
export declare const redisConfig: {
    host: string;
    port: number;
    password: string | undefined;
    maxRetriesPerRequest: null;
};
export declare const redisConnection: IORedis;
//# sourceMappingURL=redis.d.ts.map