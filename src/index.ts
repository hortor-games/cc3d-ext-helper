export namespace cce {
  export class Ipc {
    static async requestToPackage(pkName: string, method: string, ...args) {
      return Editor.Ipc.requestToPackage(pkName, method, ...args);
    }

    static async sendToAll(method: string, ...args) {
      return Editor.Ipc.sendToAll(method, ...args);
    }

    static async queryNode(uuid: string) {
      return Ipc.requestToPackage("scene", "query-node", uuid);
    }

    /**
     *
     * @return uuid
     */
    static async createAsset(url: string, content, opt: { overwrite: boolean } = {overwrite: true}): Promise<string> {
      return Ipc.requestToPackage("asset-db", "create-asset", url, content, opt);
    }

    static async queryAssetInfo(uuid: string) {
      return Ipc.requestToPackage("asset-db", "query-asset-info", uuid);
    }

    /**
     *
     * @return uuid
     */
    static async queryAssetUuid(url: string): Promise<string> {
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

  export class Component {
    uuid;

    constructor(uuid) {
      this.uuid = uuid;
    }

    async _getPropertyFull(name: string) {
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
    async getProperty(name: string): Promise<any> {
      let v = await this._getPropertyFull(name);
      return v && v.value;
    }

    /**
     *
     * @param name
     * @param value {{uuid}|string|number|boolean}
     * @returns {Promise<void>}
     */
    async setProperty(name: string, value: { uuid } | string | number | boolean) {
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
      p = {type: p.type, value: value};
      await Ipc.requestToPackage("scene", "set-property", {
        uuid: n.uuid.value,
        path: `__comps__.${idx}.${name}`,
        dump: p
      });
    }
  }

  export class Node {
    uuid;

    constructor(uuid: string) {
      this.uuid = uuid;
    }

    async _getPropertyFull(name: string): Promise<{ value, type }> {
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
    async getProperty(name: string): Promise<{ uuid } | string | number | boolean | undefined> {
      let v = await this._getPropertyFull(name);
      return v && v.value;
    }

    /**
     *
     * @param name
     * @param value {{uuid}|string|number|boolean}
     * @returns {Promise<void>}
     */
    async setProperty(name: string, value: { uuid } | string | number | boolean): Promise<void> {
      let p = await this._getPropertyFull(name.split(".")[0]);
      if (!p) {
        return;
      }
      p = {type: p.type, value: value};
      await Ipc.requestToPackage("scene", "set-property", {
        uuid: this.uuid,
        path: name,
        dump: p
      });
    }

    async addComponent(type: string): Promise<Component> {
      await Ipc.requestToPackage("scene", "create-component", {
        component: type,
        uuid: this.uuid,
      });
      let rs = await this.getComponents(type);
      return rs.length == 0 ? null : rs[rs.length - 1];
    }

    async getComponent(type: string): Promise<Component> {
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

    async getComponents(type: string): Promise<Component[]> {
      let n = await Ipc.queryNode(this.uuid);
      if (!n) {
        return [];
      }
      let rs = n.__comps__.filter(p => p.type == type).map(p => new Component(p.value.uuid.value));
      return rs;
    }

    async find(path: string): Promise<Node> {
      let tree = await Ipc.requestToPackage("scene", "query-node-tree", this.uuid);
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

    async getChildAt(idx: number): Promise<Node> {
      let tree = await Ipc.requestToPackage("scene", "query-node-tree", this.uuid);
      if (!tree) {
        return null;
      }
      if (idx < 0 || idx >= tree.children.length) {
        return null;
      }
      return new Node(tree.children[idx].uuid);
    }

    async saveToPrefab(url: string): Promise<string> {
      let info = await Ipc.requestToPackage("scene", "generate-prefab", this.uuid);
      let uuid = await Ipc.createAsset(url, info);
      let o = await Ipc.requestToPackage("scene", "link-prefab", this.uuid, uuid);
      console.log(o);
      return uuid;
    }

  }

  export class Scene {
    static async root(): Promise<Node> {
      let tree = await Ipc.requestToPackage("scene", "query-node-tree");
      return new Node(tree.uuid);
    }


    static async createNode(args: { assetUuid?: string, name?: string, parent?: string, sibling?: number, keepWorldTransform?: boolean } = {
      assetUuid: undefined,
      name: "Node",
      parent: undefined, //node uuid
      sibling: -1,
      keepWorldTransform: false
    }): Promise<Node> {
      await Ipc.snapshot();
      let uuid = await Ipc.requestToPackage("scene", "create-node", args);
      return new Node(uuid);
    }

    static async _getNodeTree() {
      let tree = await Ipc.requestToPackage("scene", "query-node-tree");
      return tree;
    }
  }
}