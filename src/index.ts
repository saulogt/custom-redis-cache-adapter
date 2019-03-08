import * as redis from 'redis';
import LRU from 'lru-cache';

const DEFAULT_REDIS_TTL = 30 * 1000; // 30 seconds in milliseconds

function debug(...args: any[]) {
  //logger.debug.apply(logger, ['RedisCacheAdapter', ...args]);
}

interface LruConfig {
  max: number;
  maxAge: number;
}

const defaultLruConfig: LruConfig = {
  max: 1000,
  maxAge: 1000 * 60, /// 1 min
};

export class RedisCacheAdapter {
  public client: any;
  public map: LRU<string, Promise<any>>;
  public ttl: number;

  constructor(redisCtx: redis.ClientOpts, ttl = DEFAULT_REDIS_TTL, lruConfig: LruConfig = defaultLruConfig) {
    this.client = redis.createClient(redisCtx);
    this.map = new LRU<string, Promise<any>>(lruConfig);
    this.ttl = ttl;
  }

  public chainPromise(key: string, promFunc: () => Promise<any>) {
    let p = this.map.get(key);
    if (!p) {
      p = Promise.resolve();
    }

    p = p.then(promFunc);
    this.map.set(key, p);
    return p;
  }

  public get(key: string) {
    debug('get', key);
    return this.chainPromise(
      key,
      () =>
        new Promise<any>(resolve => {
          this.client.get(key, function(err: Error, res: string) {
            debug('-> get', key, res);
            if (!res) {
              return resolve(null);
            }
            resolve(JSON.parse(res));
          });
        }),
    );
  }

  public put(key: string, value: any, ttl = this.ttl) {
    value = JSON.stringify(value);
    debug('put', key, value, ttl);
    if (ttl === 0) {
      return this.chainPromise(key, () => Promise.resolve());
    }
    if (ttl < 0 || isNaN(ttl)) {
      ttl = DEFAULT_REDIS_TTL;
    }
    return this.chainPromise(
      key,
      () =>
        new Promise(resolve => {
          if (ttl === Infinity) {
            this.client.set(key, value, function() {
              resolve();
            });
          } else {
            this.client.psetex(key, ttl, value, function() {
              resolve();
            });
          }
        }),
    );
  }

  public del(key: string) {
    debug('del', key);

    return this.chainPromise(
      key,
      () =>
        new Promise(resolve => {
          this.client.del(key, function() {
            resolve();
          });
        }),
    );
  }

  public clear() {
    debug('clear');

    return new Promise(resolve => {
      this.client.flushdb(function() {
        resolve();
      });
    });
  }
}

export default RedisCacheAdapter;
