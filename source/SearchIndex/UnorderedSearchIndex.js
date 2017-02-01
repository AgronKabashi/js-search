// @flow

import type { ISearchIndex } from './SearchIndex';

/**
 * Search index capable of returning results matching a set of tokens but without any meaningful rank or order.
 */
export class UnorderedSearchIndex implements ISearchIndex {
  _tokenToUidToDocumentMap : {[token : string] : {[uid : string] : any}};

  constructor() {
    this._tokenToUidToDocumentMap = {};
  }

  /**
   * @inheritDocs
   */
  indexDocument(token : string, uid : string, document : Object) : void {
    var tokenToUidToDocumentMap = this._tokenToUidToDocumentMap;

    if (!tokenToUidToDocumentMap.hasOwnProperty(token)) {
      tokenToUidToDocumentMap[token] = {};
    }

    tokenToUidToDocumentMap[token][uid] = document;
  }

  /**
   * @inheritDocs
   */
  search(tokens : Array<string>, corpus : Array<Object>) : Array<Object> {
    var uidToDocumentMap : {[uid : string]:any} = {};

    for (var i = 0, numTokens = tokens.length; i < numTokens; i++) {
      var token = tokens[i];
      var currentUidToDocumentMap = this._tokenToUidToDocumentMap[token] || {};

      if (i === 0) {
        var keys = Object.keys(currentUidToDocumentMap);
        var numKeys = keys.length;

        // Short circuit if no matches were found for any given token.
        if (numKeys === 0) {
          return [];
        }

        for (var i = 0; i < numKeys; i++) {
          var uid = keys[i];

          uidToDocumentMap[uid] = currentUidToDocumentMap[uid];
        }
      } else {
        var keys = Object.keys(currentUidToDocumentMap);
        var numKeys = keys.length;

        // Short circuit if no matches were found for any given token.
        if (numKeys === 0) {
          return [];
        }

        for (var i = 0; i < numKeys; i++) {
          var uid = keys[i];

          if (!currentUidToDocumentMap.hasOwnProperty(uid)) {
            delete uidToDocumentMap[uid];
          }
        }
      }
    }

    return ((Object.values(uidToDocumentMap) : any) : Array<Object>);
  }
};
