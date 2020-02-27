"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cce;
(function (cce) {
    class Ipc {
        static async requestToPackage(pkName, method, ...args) {
            return Editor.Ipc.requestToPackage(pkName, method, ...args);
        }
        static async sendToAll(method, ...args) {
            return Editor.Ipc.sendToAll(method, ...args);
        }
        static async queryNode(uuid) {
            return Ipc.requestToPackage("scene", "query-node", uuid);
        }
        static async queryNodeTree(uuid) {
            return Ipc.requestToPackage("scene", "query-node-tree", uuid);
        }
        /**
         *
         * @return uuid
         */
        static async createAsset(url, content, opt = { overwrite: true }) {
            return Ipc.requestToPackage("asset-db", "create-asset", url, content, opt);
        }
        static async queryAssetInfo(uuid) {
            return Ipc.requestToPackage("asset-db", "query-asset-info", uuid);
        }
        /**
         *
         * @return uuid
         */
        static async queryAssetUuid(url) {
            return Ipc.requestToPackage("asset-db", "query-asset-uuid", url);
        }
        static async queryAssets() {
            return Ipc.requestToPackage("asset-db", "query-assets");
        }
        static async snapshot() {
            await Ipc.requestToPackage("scene", "snapshot");
        }
        static async queryComponents() {
            return await Ipc.requestToPackage("scene", "query-components");
        }
    }
    cce.Ipc = Ipc;
    class Component {
        constructor(uuid) {
            this.uuid = uuid;
        }
        async _getPropertyFull(name) {
            let c = await Ipc.requestToPackage("scene", "query-component", this.uuid);
            if (!c) {
                return undefined;
            }
            let v = c.value[name];
            return v;
        }
        /**
         *
         * @param name
         * @returns {Promise<{uuid}|string|number|boolean|undefined>}
         */
        async getProperty(name) {
            let v = await this._getPropertyFull(name);
            return v && v.value;
        }
        /**
         *
         * @param name
         * @param value {{uuid}|string|number|boolean}
         * @returns {Promise<void>}
         */
        async setProperty(name, value) {
            let n = await this.getProperty("node");
            if (!n) {
                return;
            }
            n = await Ipc.requestToPackage("scene", "query-node", n.uuid);
            if (!n) {
                return;
            }
            let idx = n.__comps__.findIndex(p => p.value.uuid.value == this.uuid);
            if (idx < 0) {
                return;
            }
            let p = await this._getPropertyFull(name.split(".")[0]);
            if (!p) {
                return p;
            }
            p = { type: p.type, value: value };
            await Ipc.requestToPackage("scene", "set-property", {
                uuid: n.uuid.value,
                path: `__comps__.${idx}.${name}`,
                dump: p
            });
        }
    }
    cce.Component = Component;
    class Node {
        constructor(uuid) {
            this.uuid = uuid;
        }
        async _getPropertyFull(name) {
            let n = await Ipc.queryNode(this.uuid);
            if (!n) {
                return undefined;
            }
            let v = n[name];
            return v;
        }
        /**
         *
         * @param name
         * @returns {Promise<{uuid}|string|number|boolean|undefined>}
         */
        async getProperty(name) {
            let v = await this._getPropertyFull(name);
            return v && v.value;
        }
        /**
         *
         * @param name
         * @param value {{uuid}|string|number|boolean}
         * @returns {Promise<void>}
         */
        async setProperty(name, value) {
            let p = await this._getPropertyFull(name.split(".")[0]);
            if (!p) {
                return;
            }
            p = { type: p.type, value: value };
            await Ipc.requestToPackage("scene", "set-property", {
                uuid: this.uuid,
                path: name,
                dump: p
            });
        }
        async addComponent(type) {
            await Ipc.requestToPackage("scene", "create-component", {
                component: type,
                uuid: this.uuid,
            });
            let rs = await this.getComponents(type);
            return rs.length == 0 ? null : rs[rs.length - 1];
        }
        async getComponent(type) {
            let n = await Ipc.queryNode(this.uuid);
            if (!n) {
                return null;
            }
            let c = n.__comps__.find(p => p.type == type);
            if (!c) {
                return null;
            }
            return new Component(c.value.uuid.value);
        }
        async getComponents(type) {
            let n = await Ipc.queryNode(this.uuid);
            if (!n) {
                return [];
            }
            if (!type) {
                return n.__comps__.map(p => new Component(p.value.uuid.value));
            }
            let rs = n.__comps__.filter(p => p.type == type).map(p => new Component(p.value.uuid.value));
            return rs;
        }
        async find(path) {
            let tree = await Ipc.queryNodeTree(this.uuid);
            if (!tree) {
                return null;
            }
            let ps = path.split("/");
            if (ps.length == 0) {
                return null;
            }
            let n = tree;
            for (let i = 0; i < ps.length; i++) {
                n = n.children.find(p => p.name == ps[i]);
                if (!n) {
                    return null;
                }
            }
            return new Node(n.uuid);
        }
        async getChildAt(idx) {
            let tree = await Ipc.queryNodeTree(this.uuid);
            if (!tree) {
                return null;
            }
            if (idx < 0 || idx >= tree.children.length) {
                return null;
            }
            return new Node(tree.children[idx].uuid);
        }
        async getChildren(idx) {
            let tree = await Ipc.queryNodeTree(this.uuid);
            if (!tree) {
                return null;
            }
            let nodes = tree.children.map(c => new Node(c.uuid));
            return nodes;
        }
        async saveToPrefab(url) {
            let info = await Ipc.requestToPackage("scene", "generate-prefab", this.uuid);
            let uuid = await Ipc.createAsset(url, info);
            let o = await Ipc.requestToPackage("scene", "link-prefab", this.uuid, uuid);
            console.log(o);
            return uuid;
        }
    }
    cce.Node = Node;
    class Scene {
        static async root() {
            let tree = await Ipc.queryNodeTree();
            return new Node(tree.uuid);
        }
        static async createNode(args = {
            assetUuid: undefined,
            name: "Node",
            parent: undefined,
            sibling: -1,
            keepWorldTransform: false
        }) {
            await Ipc.snapshot();
            let uuid = await Ipc.requestToPackage("scene", "create-node", args);
            return new Node(uuid);
        }
        static async _getNodeTree() {
            let tree = await Ipc.requestToPackage("scene", "query-node-tree");
            return tree;
        }
    }
    cce.Scene = Scene;
})(cce = exports.cce || (exports.cce = {}));
