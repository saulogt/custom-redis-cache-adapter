# custom-redis-cache-adapter

Base on this file:
https://github.com/parse-community/parse-server/blob/master/src/Adapters/Cache/RedisCacheAdapter.js

Modified RedisCacheAdapter due to performace issue.
https://github.com/parse-community/parse-server/issues/5401


### ggg

## Usage
```
npm i lru-custom-redis-cache-adapter
```

```ts
import { RedisCacheAdapter } from 'lru-custom-redis-cache-adapter';

const parseServer = new ParseServer({

    /// Other options

    cacheAdapter: new RedisCacheAdapter({ url: process.env.REDIS_URL });

});


```
