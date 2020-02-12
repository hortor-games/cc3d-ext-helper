"use strict";

let cce = {};
cce.Ipc = class {
  static async requestToPackage(pkName, method, ...args) {
    return Editor.Ipc.requestToPackage(pkName, method, ...args);
  }

  static async sendToAll(method, ...args) {
    return Editor.Ipc.sendToAll(method, ...args);
  }

  static async queryNode(uuid) {
    return cce.Ipc.requestToPackage("scene", "query-node", uuid);
  }

  static async createAsset(path, content, opt = {overwrite: true}) {
    return cce.Ipc.requestToPackage("asset-db", "create-asset", path, content, opt);
  }

  static async queryAssetInfo(uuid) {
    return cce.Ipc.requestToPackage("asset-db", "query-asset-info", uuid);
  }

  static async queryAssets() {
    return cce.Ipc.requestToPackage("asset-db", "query-assets");
  }

  static async snapshot() {
    await cce.Ipc.requestToPackage("scene", "snapshot");
  }

  static async queryComponents() {
    return await cce.Ipc.requestToPackage("scene", "query-components");
  }
};


cce.Component = class {
  uuid;

  constructor(uuid) {
    this.uuid = uuid;
  }

  async _getPropertyFull(name) {
    let c = await cce.Ipc.requestToPackage("scene", "query-component", this.uuid);
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
    n = await cce.Ipc.requestToPackage("scene", "query-node", n.uuid);
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
    await cce.Ipc.requestToPackage("scene", "set-property", {
      uuid: n.uuid.value,
      path: `__comps__.${idx}.${name}`,
      dump: p
    });
  }
};


cce.Node = class {
  uuid;

  constructor(uuid) {
    this.uuid = uuid;
  }

  async _getPropertyFull(name) {
    let n = await cce.Ipc.queryNode(this.uuid);
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
      return p;
    }
    p = {type: p.type, value: value};
    await cce.Ipc.requestToPackage("scene", "set-property", {
      uuid: this.uuid,
      path: name,
      dump: p
    });
  }

  /**
   *
   * @param type
   * @returns {Promise<cce.Component|null>}
   */
  async addComponent(type) {
    await cce.Ipc.requestToPackage("scene", "create-component", {
      component: type,
      uuid: this.uuid,
    });
    let rs = await this.getComponents(type);
    return rs.length == 0 ? null : rs[rs.length - 1];
  }

  /**
   *
   * @param type
   * @returns {Promise<cce.Component|null>}
   */
  async getComponent(type) {
    let n = await cce.Ipc.queryNode(this.uuid);
    if (!n) {
      return null;
    }
    let c = n.__comps__.find(p => p.type == type);
    if (!c) {
      return null;
    }
    return new cce.Component(c.value.uuid.value);
  }

  /**
   *
   * @param type
   * @returns {Promise<cce.Component[]>}
   */
  async getComponents(type) {
    let n = await cce.Ipc.queryNode(this.uuid);
    if (!n) {
      return [];
    }
    let rs = n.__comps__.filter(p => p.type == type).map(p => new cce.Component(p.value.uuid.value));
    return rs;
  }

  /**
   *
   * @param path
   * @returns {Promise<cce.Node|null>}
   */
  async find(path) {
    let tree = await cce.Ipc.requestToPackage("scene", "query-node-tree", this.uuid);
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
    return new cce.Node(n.uuid);
  }

  /**
   *
   * @param idx
   * @returns {Promise<cce.Node|null>}
   */
  async getChildAt(idx) {
    let tree = await cce.Ipc.requestToPackage("scene", "query-node-tree", this.uuid);
    if (!tree) {
      return null;
    }
    if (idx < 0 || idx >= tree.children.length) {
      return null;
    }
    return new cce.Node(tree.children[idx].uuid);
  }

  /**
   *
   * @param path {string} db://assets/xxx
   * @returns {Promise<string>} prefab uuid
   */
  async saveToPrefab(path) {
    let info = await cce.Ipc.requestToPackage("scene", "generate-prefab", this.uuid);
    let uuid = await cce.Ipc.createAsset(path, info);
    let o = await cce.Ipc.requestToPackage("scene", "link-prefab", this.uuid, uuid);
    console.log(o);
    return uuid;
  }
};

cce.Scene = class {
  static async root() {
    let tree = await cce.Ipc.requestToPackage("scene", "query-node-tree");
    return new cce.Node(tree.uuid);
  }

  /**
   *
   * @param name string
   * @param parent Node
   * @param sibling number
   * @param keepWorldTransform boolean
   * @returns {Promise<cce.Node>}
   */
  static async createNode(args = {
    assetUuid: undefined,
    name: "Node",
    parent: undefined, //node uuid
    sibling: -1,
    keepWorldTransform: false
  }) {
    await cce.Ipc.snapshot();
    let uuid = await cce.Ipc.requestToPackage("scene", "create-node", args);
    return new cce.Node(uuid);
  }

  static async _getNodeTree() {
    let tree = await cce.Ipc.requestToPackage("scene", "query-node-tree");
    return tree;
  }
};

module.exports = cce;