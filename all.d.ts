declare module "index" {
    import redis = require("redis");
    import { Messenger } from "Messenger";
    export function create(port: number, host: string, options?: redis.ClientOpts | undefined): Messenger;
}
declare module "Messenger" {
    export class Messenger extends EventEmitter {
        /**
         *
         * @param {import("redis").RedisClient} sender
         * @param {import("redis").RedisClient} listener
         */
        constructor(sender: import("redis").RedisClient, listener: import("redis").RedisClient);
        /**
         * @private
         */
        private sender;
        /**
         * @private
         */
        private listener;
        /**
         * @private
         * @type {string | undefined}
         */
        private myId;
        /**
         * @private
         * @type {{to: any, data: {from?: any, content: any, eventName: string}}[]}
         */
        private sendQueue;
        /**
         * @private
         */
        private registering;
        /**
         * @private
         */
        private broadcastRoom;
        /**
         * @param {string} val
         */
        setBroadcastRoom(val: string): void;
        /**
         *
         * @param {string} eventName
         * @param {any} eventData
         */
        broadcast(eventName: string, eventData: any): void;
        /**
         *
         * @param {*} to - channel to publish to
         * @param {*} eventName
         * @param {*} content
         * @returns
         */
        send(to: any, eventName: any, content: any): Error | undefined;
        /**
         * checks if a channel is still open
         * @param {string} id
         * @param {(alive: boolean) => void} callback
         */
        isAlive(id: string, callback: (alive: boolean) => void): void;
        /**
         *
         * @param {string} channel
         */
        join(channel: string): void;
        /**
         *
         * @param {string} channel
         */
        leave(channel: string): void;
        /**
         *
         * @param {string} me - my instance id; auto generated if not given
         * @param {(myInstanceId: string) => void} cb
         */
        register(me: string, cb: (myInstanceId: string) => void): void;
        unregister(): void;
        /**
         *
         * @returns Returns my instance id (aka channel name)
         */
        whoAmI(): string | undefined;
        /**
         * @private
         */
        private flushSendQueue;
        /**
         *
         * @param {(channels: string[]) => void} callback
         */
        getChannels(callback: (channels: string[]) => void): void;
    }
    import { EventEmitter } from "events";
}
