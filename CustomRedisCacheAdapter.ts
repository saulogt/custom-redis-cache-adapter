import * as redis from 'redis';
import * as LRU from 'lru-cache';

const DEFAULT_REDIS_TTL = 30 * 1000; // 30 seconds in milliseconds

function debug(...args) {
  //logger.debug.apply(logger, ['RedisCacheAdapter', ...args]);
}

export class RedisCacheAdapter {
  public client: any;
  public map: LRU<string, Promise<any>>;
  public ttl: number;

  constructor(redisCtx, ttl = DEFAULT_REDIS_TTL) {
    this.client = redis.createClient(redisCtx);
    //this.p = Promise.resolve();
    this.map = new LRU({
      max: 1000,
      maxAge: 1000 * 60, /// 1 min
    });

    this.ttl = ttl;
  }

  public queuePromise(key, prom: Promise<any>) {
    let p = this.map.get(key);
    if (!p) {
      p = Promise.resolve();
      this.map.set(key, p);
    }

    p = p.then(() => prom);
    return p;
  }

  public get(key) {
    debug('get', key);
    //this.p = this.p.then(() => {
    return this.queuePromise(
      key,
      new Promise<any>(resolve => {
        this.client.get(key, function(err, res) {
          debug('-> get', key, res);
          if (!res) {
            return resolve(null);
          }
          resolve(JSON.parse(res));
        });
      }),
    );
    //});
    //return this.p;
  }

  public put(key, value, ttl = this.ttl) {
    value = JSON.stringify(value);
    debug('put', key, value, ttl);
    if (ttl === 0) {
      //return this.p; // ttl of zero is a logical no-op, but redis cannot set expire time of zero
      return this.queuePromise(key, Promise.resolve());
    }
    if (ttl < 0 || isNaN(ttl)) {
      ttl = DEFAULT_REDIS_TTL;
    }
    //this.p = this.p.then(() => {
    return this.queuePromise(
      key,
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
    //});
    //return this.p;
  }

  public del(key) {
    debug('del', key);
    //this.p = this.p.then(() => {
    return this.queuePromise(
      key,
      new Promise(resolve => {
        this.client.del(key, function() {
          resolve();
        });
      }),
    );
    //});
    //return this.p;
  }

  public clear() {
    debug('clear');
    //this.p = this.p.then(() => {
    return new Promise(resolve => {
      this.client.flushdb(function() {
        resolve();
      });
    });
    //});
    //return this.p;
  }
}

export default RedisCacheAdapter;
