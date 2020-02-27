export declare namespace cce {
    class Ipc {
        static requestToPackage(pkName: string, method: string, ...args: any[]): Promise<any>;
        static sendToAll(method: string, ...args: any[]): Promise<any>;
        static queryNode(uuid: string): Promise<any>;
        static queryNodeTree(uuid?: string): Promise<any>;
        /**
         *
         * @return uuid
         */
        static createAsset(url: string, content: any, opt?: {
            overwrite: boolean;
        }): Promise<string>;
        static queryAssetInfo(uuid: string): Promise<any>;
        /**
         *
         * @return uuid
         */
        static queryAssetUuid(url: string): Promise<string>;
        static queryAssets(): Promise<any>;
        static snapshot(): Promise<void>;
        static queryComponents(): Promise<any>;
    }
    class Component {
        uuid: any;
        constructor(uuid: any);
        _getPropertyFull(name: string): Promise<any>;
        /**
         *
         * @param name
         * @returns {Promise<{uuid}|string|number|boolean|undefined>}
         */
        getProperty(name: string): Promise<any>;
        /**
         *
         * @param name
         * @param value {{uuid}|string|number|boolean}
         * @returns {Promise<void>}
         */
        setProperty(name: string, value: {
            uuid: any;
        } | string | number | boolean): Promise<any>;
    }
    class Node {
        uuid: any;
        constructor(uuid: string);
        _getPropertyFull(name: string): Promise<{
            value: any;
            type: any;
        }>;
        /**
         *
         * @param name
         * @returns {Promise<{uuid}|string|number|boolean|undefined>}
         */
        getProperty(name: string): Promise<{
            uuid: any;
        } | string | number | boolean | undefined>;
        /**
         *
         * @param name
         * @param value {{uuid}|string|number|boolean}
         * @returns {Promise<void>}
         */
        setProperty(name: string, value: {
            uuid: any;
        } | string | number | boolean): Promise<void>;
        addComponent(type: string): Promise<Component>;
        getComponent(type: string): Promise<Component>;
        getComponents(type?: string): Promise<Component[]>;
        find(path: string): Promise<Node>;
        getChildAt(idx: number): Promise<Node>;
        getChildren(idx: number): Promise<Node[]>;
        saveToPrefab(url: string): Promise<string>;
    }
    class Scene {
        static root(): Promise<Node>;
        static createNode(args?: {
            assetUuid?: string;
            name?: string;
            parent?: string;
            sibling?: number;
            keepWorldTransform?: boolean;
        }): Promise<Node>;
        static _getNodeTree(): Promise<any>;
    }
}
