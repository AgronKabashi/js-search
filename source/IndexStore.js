// @flow

// TODO Support serialization for persistence?

export class IndexStore<I> {
  constructor() {
    this._root = {
      docs: {}
    }
  }

  add(key : string, uid : string, value : I) : void {
    if (!key) {
      return null;
    }

    var node = this._root;    
    for (var i = 0, length = key.length; i < length; i++) {
      var char = key.charAt(i);
      if (!node.hasOwnProperty(char)) {
        node[char] = {
          docs: {}
        };
      }
      node = node[char];
    }

    node.docs[uid] = value;
  }

  get(key : string) : ?I {
    if (!key) {
      return null;
    }

    var node = this._root;  
    for (var i = 0, length = key.length; i < length; i++) {
      var char = key.charAt(i);
      if (!node.hasOwnProperty(char)) {
        return null;
      }
      node = node[char];
    }

    return node.docs;
  }

  has(key : string) : boolean {
    return !!this.get(key);
  }

  remove(key : string, uid : string) : void {
    if (!key) {
      return null;
    }

    var node = this._root;  
    for (var i = 0, length = key.length; i < length; i++) {
      var char = key.charAt(i);
      if (!node.hasOwnProperty(char)) {
        return null;
      }
      node = node[char];
    }

    delete node.docs[uid]
  }
}