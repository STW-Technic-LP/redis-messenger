import redis = require("redis");
import Messenger = require("./messenger");
export function create(port: number, host: string, options?: redis.ClientOpts | undefined): Messenger;
