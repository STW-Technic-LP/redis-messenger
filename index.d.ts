import redis = require("redis");
import { Messenger } from "./Messenger";
export function create(port: number, host: string, options?: redis.ClientOpts | undefined): Messenger;
