import { Messenger } from "./Messenger";
import redis = require("redis");
export { Messenger };
export declare function create(port: number, host: string, options?: redis.ClientOpts | undefined): Messenger;
