// @flow

import type { ISearchIndex } from './SearchIndex';

type ITfIdfTokenMap = {
  [token : string] : ITfIdfTokenMetadata;
};

type ITfIdfUidMap = {
  [uid : string] : ITfIdfUidMetadata;
};

type ITfIdfTokenMetadata = {
  $numDocumentOccurrences : number;
  $totalNumOccurrences : number;
  $uidMap : ITfIdfUidMap;
};

type ITfIdfUidMetadata = {
  $document : Object;
  $numTokenOccurrences : number;
};

/**
 * Search index capable of returning results matching a set of tokens and ranked according to TF-IDF.
 */
export class TfIdfSearchIndex implements ISearchIndex {
  _uidFieldName : string;
  _tokenToIdfCache : {[token : string] : number};
  _tokenMap : ITfIdfTokenMap;

  constructor(uidFieldName : string) {
    this._uidFieldName = uidFieldName;
    this._tokenToIdfCache = {};
    this._tokenMap = {};
  }

  /**
   * @inheritDocs
   */
  indexDocument(token : string, uid : string, doc : Object) : void {
    this._tokenToIdfCache = {}; // New index invalidates previous IDF caches

    var tokenMap = this._tokenMap;
    var tokenDatum;

    if (!tokenMap.hasOwnProperty(token)) {
      tokenMap[token] = tokenDatum = {
        $numDocumentOccurrences: 0,
        $totalNumOccurrences: 1,
        $uidMap: {},
      };
    } else {
      tokenDatum = tokenMap[token];
      tokenDatum.$totalNumOccurrences++;
    }

    var uidMap = tokenDatum.$uidMap;

    if (!uidMap.hasOwnProperty(uid)) {
      tokenDatum.$numDocumentOccurrences++;
      uidMap[uid] = {
        $document: doc,
        $numTokenOccurrences: 1
      };
    } else {
      uidMap[uid].$numTokenOccurrences++;
    }
  }

  /**
   * @inheritDocs
   */
  search(tokens : Array<string>, corpus : Array<Object>) : Array<Object> {
    var uidToDocumentMap : {[uid : string] : Object} = {};

    for (var i = 0, numTokens = tokens.length; i < numTokens; i++) {
      var token = tokens[i];
      var tokenMetadata = this._tokenMap[token];

      // Short circuit if no matches were found for any given token.
      if (!tokenMetadata) {
        return [];
      }

      var uidMap = tokenMetadata.$uidMap;

      if (i === 0) {
        var keys = Object.keys(uidMap);
        for (var j = 0, numKeys = keys.length; j < numKeys; j++) {
          var uid = keys[j];

          uidToDocumentMap[uid] = uidMap[uid].$document;
        }
      } else {
        var keys = Object.keys(uidToDocumentMap);
        for (var j = 0, numKeys = keys.length; j < numKeys; j++) {
          var uid = keys[j];

          if (!uidMap.hasOwnProperty(uid)) {
            delete uidToDocumentMap[uid];
          }
        }
      }
    }

    var documents : Array<Object> = ((Object.values(uidToDocumentMap) : any) : Array<Object>);

    // Return documents sorted by TF-IDF
    return documents.sort((documentA, documentB) =>
      this._calculateTfIdf(tokens, documentB, corpus) -
      this._calculateTfIdf(tokens, documentA, corpus)
    );
  }

  /**
   * Calculate the inverse document frequency of a search token. This calculation diminishes the weight of tokens that
   * occur very frequently in the set of searchable documents and increases the weight of terms that occur rarely.
   */
  _calculateIdf(token : string, documents : Array<Object>) : number {
    var tokenToIdfCache = this._tokenToIdfCache;
    if (!tokenToIdfCache.hasOwnProperty(token)) {
      var tokenMap = this._tokenMap;
      var numDocumentsWithToken:number = tokenMap.hasOwnProperty(token)
        ? tokenMap[token].$numDocumentOccurrences
        : 0;

      var calculated = tokenToIdfCache[token] = 1 + Math.log(documents.length / (1 + numDocumentsWithToken));

      return calculated;
    }

    return tokenToIdfCache[token];
  }

  /**
   * Calculate the term frequency–inverse document frequency (TF-IDF) ranking for a set of search tokens and a
   * document. The TF-IDF is a numeric statistic intended to reflect how important a word (or words) are to a document
   * in a corpus. The TF-IDF value increases proportionally to the number of times a word appears in the document but
   * is offset by the frequency of the word in the corpus. This helps to adjust for the fact that some words appear
   * more frequently in general (e.g. a, and, the).
   */
  _calculateTfIdf(tokens : Array<string>, doc : Object, documents : Array<Object>) : number {
    var score = 0;
    var uidFieldName = this._uidFieldName;

    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      var token = tokens[i];

      var inverseDocumentFrequency = this._calculateIdf(token, documents);

      if (inverseDocumentFrequency === Infinity) {
        inverseDocumentFrequency = 0;
      }

      var uid = doc[uidFieldName];
      var tokenDatum = this._tokenMap[token];
      var uidMap = tokenDatum && tokenDatum.$uidMap[uid];
      var termFrequency = uidMap && uidMap.$numTokenOccurrences || 0;

      score += termFrequency * inverseDocumentFrequency;
    }

    return score;
  }
};
