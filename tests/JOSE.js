/*API Key
J6rSeNV1QsOV2R4jOFWZNQ

API Secret
dChRWqkPTeBRn2YfuMYkeJdkknZ0WDcdnM2L

IM Chat History Token
eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJJTFNJMWEzZFRiV0E1QWNhSzlFUEdnIn0.vzdMFPi7284aL80qbRgO1-JW4K8vVU4Y7fcdmJW8guA

*/
/*-
 * Copyright 2014 Square Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The WebCryptographer uses http://www.w3.org/TR/WebCryptoAPI/ to perform
 * various crypto operations. In theory, this should help build the library with
 * different underlying crypto APIs. I'm however unclear if we'll run into code
 * duplication or callback vs Promise based API issues.
 */
var WebCryptographer = function() {
  this.setKeyEncryptionAlgorithm("RSA-OAEP");
  this.setContentEncryptionAlgorithm("A256GCM");
  this.setContentSignAlgorithm("RS256");
};

Jose.WebCryptographer = WebCryptographer;

/**
 * Overrides the default key encryption algorithm
 * @param alg  string
 */
WebCryptographer.prototype.setKeyEncryptionAlgorithm = function(alg) {
  this.key_encryption = getCryptoConfig(alg);
};

WebCryptographer.prototype.getKeyEncryptionAlgorithm = function() {
  return this.key_encryption.jwe_name;
};

/**
 * Overrides the default content encryption algorithm
 * @param alg  string
 */
WebCryptographer.prototype.setContentEncryptionAlgorithm = function(alg) {
  this.content_encryption = getCryptoConfig(alg);
};

WebCryptographer.prototype.getContentEncryptionAlgorithm = function() {
  return this.content_encryption.jwe_name;
};

/**
 * Overrides the default content sign algorithm
 * @param alg  string
 */
WebCryptographer.prototype.setContentSignAlgorithm = function(alg) {
  this.content_sign = getSignConfig(alg);
};

WebCryptographer.prototype.getContentSignAlgorithm = function() {
  return this.content_sign.jwa_name;
};

/**
 * Generates an IV.
 * This function mainly exists so that it can be mocked for testing purpose.
 *
 * @return Uint8Array with random bytes
 */
WebCryptographer.prototype.createIV = function() {
  var iv = new Uint8Array(new Array(this.content_encryption.iv_bytes));
  return Jose.crypto.getRandomValues(iv);
};

/**
 * Creates a random content encryption key.
 * This function mainly exists so that it can be mocked for testing purpose.
 *
 * @return Promise<CryptoKey>
 */
WebCryptographer.prototype.createCek = function() {
  var hack = getCekWorkaround(this.content_encryption);
  return Jose.crypto.subtle.generateKey(hack.id, true, hack.enc_op);
};

WebCryptographer.prototype.wrapCek = function(cek, key) {
  return Jose.crypto.subtle.wrapKey("raw", cek, key, this.key_encryption.id);
};

WebCryptographer.prototype.unwrapCek = function(cek, key) {
  var hack = getCekWorkaround(this.content_encryption);
  var extractable = (this.content_encryption.specific_cek_bytes > 0);
  var key_encryption = this.key_encryption.id;

  return Jose.crypto.subtle.unwrapKey("raw", cek, key, key_encryption, hack.id, extractable, hack.dec_op);
};

/**
 * Returns algorithm and operation needed to create a CEK.
 *
 * In some cases, e.g. A128CBC-HS256, the CEK gets split into two keys. The Web
 * Crypto API does not allow us to generate an arbitrary number of bytes and
 * then create a CryptoKey without any associated algorithm. We therefore piggy
 * back on AES-CBS and HMAC which allows the creation of CEKs of size 16, 32, 64
 * and 128 bytes.
 */
var getCekWorkaround = function(alg) {
  var len = alg.specific_cek_bytes;
  if (len) {
    if (len == 16) {
      return {id: {name: "AES-CBC", length: 128}, enc_op: ["encrypt"], dec_op: ["decrypt"]};
    } else if (len == 32) {
      return {id: {name: "AES-CBC", length: 256}, enc_op: ["encrypt"], dec_op: ["decrypt"]};
    } else if (len == 64) {
      return {id: {name: "HMAC", hash: {name: "SHA-256"}}, enc_op: ["sign"], dec_op: ["verify"]};
    } else if (len == 128) {
      return {id: {name: "HMAC", hash: {name: "SHA-384"}}, enc_op: ["sign"], dec_op: ["verify"]};
    } else {
      Jose.assert(false, "getCekWorkaround: invalid len");
    }
  }
  return {id: alg.id, enc_op: ["encrypt"], dec_op: ["decrypt"]};
};

/**
 * Encrypts plain_text with cek.
 *
 * @param iv          Uint8Array
 * @param aad         Uint8Array
 * @param cek_promise Promise<CryptoKey>
 * @param plain_text  Uint8Array
 * @return Promise<json>
 */
WebCryptographer.prototype.encrypt = function(iv, aad, cek_promise, plain_text) {
  var config = this.content_encryption;
  if (iv.length != config.iv_bytes) {
    return Promise.reject(Error("invalid IV length"));
  }
  if (config.auth.aead) {
    var tag_bytes = config.auth.tag_bytes;

    var enc = {
      name: config.id.name,
      iv: iv,
      additionalData: aad,
      tagLength: tag_bytes * 8
    };

    return cek_promise.then(function(cek) {
      return Jose.crypto.subtle.encrypt(enc, cek, plain_text).then(function(cipher_text) {
        var offset = cipher_text.byteLength - tag_bytes;
        return {
          cipher: cipher_text.slice(0, offset),
          tag: cipher_text.slice(offset)
        };
      });
    });
  } else {
    var keys = splitKey(config, cek_promise, ["encrypt"]);
    var mac_key_promise = keys[0];
    var enc_key_promise = keys[1];

    // Encrypt the plain text
    var cipher_text_promise = enc_key_promise.then(function(enc_key) {
      var enc = {
        name: config.id.name,
        iv: iv
      };
      return Jose.crypto.subtle.encrypt(enc, enc_key, plain_text);
    });

    // compute MAC
    var mac_promise = cipher_text_promise.then(function(cipher_text) {
      return truncatedMac(
        config,
        mac_key_promise,
        aad,
        iv,
        cipher_text);
    });

    return Promise.all([cipher_text_promise, mac_promise]).then(function(all) {
      var cipher_text = all[0];
      var mac = all[1];
      return {
        cipher: cipher_text,
        tag: mac
      };
    });
  }
};

/**
 * Decrypts cipher_text with cek. Validates the tag.
 *
 * @param cek_promise    Promise<CryptoKey>
 * @param aad protected header
 * @param iv IV
 * @param cipher_text text to be decrypted
 * @param tag to be verified
 * @return Promise<string>
 */
WebCryptographer.prototype.decrypt = function(cek_promise, aad, iv, cipher_text, tag) {
  /**
   * Compares two Uint8Arrays in constant time.
   *
   * @return Promise<void>
   */
  var compare = function(config, mac_key_promise, arr1, arr2) {
    Jose.assert(arr1 instanceof Uint8Array, "compare: invalid input");
    Jose.assert(arr2 instanceof Uint8Array, "compare: invalid input");

    return mac_key_promise.then(function(mac_key) {
      var hash1 = Jose.crypto.subtle.sign(config.auth.id, mac_key, arr1);
      var hash2 = Jose.crypto.subtle.sign(config.auth.id, mac_key, arr2);
      return Promise.all([hash1, hash2]).then(function(all) {
        var hash1 = new Uint8Array(all[0]);
        var hash2 = new Uint8Array(all[1]);
        if (hash1.length != hash2.length) {
          throw new Error("compare failed");
        }
        for (var i = 0; i < hash1.length; i++) {
          if (hash1[i] != hash2[i]) {
            throw new Error("compare failed");
          }
        }
        return Promise.resolve(null);
      });
    });
  };

  if (iv.length != this.content_encryption.iv_bytes) {
    return Promise.reject(Error("decryptCiphertext: invalid IV"));
  }

  var config = this.content_encryption;
  if (config.auth.aead) {
    var dec = {
      name: config.id.name,
      iv: iv,
      additionalData: aad,
      tagLength: config.auth.tag_bytes * 8
    };

    return cek_promise.then(function(cek) {
      var buf = Utils.arrayBufferConcat(cipher_text, tag);
      return Jose.crypto.subtle.decrypt(dec, cek, buf);
    });
  } else {
    var keys = splitKey(config, cek_promise, ["decrypt"]);
    var mac_key_promise = keys[0];
    var enc_key_promise = keys[1];

    // Validate the MAC
    var mac_promise = truncatedMac(
      config,
      mac_key_promise,
      aad,
      iv,
      cipher_text);

    return Promise.all([enc_key_promise, mac_promise]).then(function(all) {
      var enc_key = all[0];
      var mac = all[1];

      return compare(config, mac_key_promise, new Uint8Array(mac), tag).then(function() {
        var dec = {
          name: config.id.name,
          iv: iv
        };
        return Jose.crypto.subtle.decrypt(dec, enc_key, cipher_text);
      }).catch(function(err) {
        return Promise.reject(Error("decryptCiphertext: MAC failed."));
      });
    });
  }
};

/**
 * Signs plain_text.
 *
 * @param aad         json
 * @param payload     String or json
 * @param key_promise Promise<CryptoKey>
 * @return Promise<ArrayBuffer>
 */
WebCryptographer.prototype.sign = function(aad, payload, key_promise) {
  var config = this.content_sign;

  if (aad.alg) {
    config = getSignConfig(aad.alg);
  }

  // Encrypt the plain text
  return key_promise.then(function(key) {
    return Jose.crypto.subtle.sign(config.id, key, Utils.arrayFromString(Utils.Base64Url.encode(JSON.stringify(aad)) + '.' + Utils.Base64Url.encodeArray(payload)));
  });
};

/**
 * Verify JWS.
 *
 * @param payload     Base64Url encoded payload
 * @param aad         String Base64Url encoded JSON representation of the protected JWS header
 * @param signature   Uint8Array containing the signature
 * @param key_promise Promise<CryptoKey>
 * @param key_id      value of the kid JoseHeader, it'll be passed as part of the result to the returned promise
 * @return Promise<json>
 */
WebCryptographer.prototype.verify = function(aad, payload, signature, key_promise, key_id) {
  var config = this.content_sign;

  return key_promise.then(function(key) {
    config = getSignConfig(getJwaNameForSignKey(key));
    return Jose.crypto.subtle.verify(config.id, key, signature, Utils.arrayFromString(aad + "." + payload)).then(function(res) {
      return {kid: key_id, verified: res};
    });
  });
};

Jose.WebCryptographer.keyId = function(rsa_key) {
  return Utils.sha256(rsa_key.n + "+" + rsa_key.d);
};

/**
 * Splits a CEK into two pieces: a MAC key and an ENC key.
 *
 * This code is structured around the fact that the crypto API does not provide
 * a way to validate truncated MACs. The MAC key is therefore always imported to
 * sign data.
 *
 * @param config (used for key lengths & algorithms)
 * @param cek_promise Promise<CryptoKey>  CEK key to split
 * @param purpose Array<String> usages of the imported key
 * @return [Promise<mac key>, Promise<enc key>]
 */
var splitKey = function(config, cek_promise, purpose) {
  // We need to split the CEK key into a MAC and ENC keys
  var cek_bytes_promise = cek_promise.then(function(cek) {
    return Jose.crypto.subtle.exportKey("raw", cek);
  });
  var mac_key_promise = cek_bytes_promise.then(function(cek_bytes) {
    if (cek_bytes.byteLength * 8 != config.id.length + config.auth.key_bytes * 8) {
      return Promise.reject(Error("encryptPlainText: incorrect cek length"));
    }
    var bytes = cek_bytes.slice(0, config.auth.key_bytes);
    return Jose.crypto.subtle.importKey("raw", bytes, config.auth.id, false, ["sign"]);
  });
  var enc_key_promise = cek_bytes_promise.then(function(cek_bytes) {
    if (cek_bytes.byteLength * 8 != config.id.length + config.auth.key_bytes * 8) {
      return Promise.reject(Error("encryptPlainText: incorrect cek length"));
    }
    var bytes = cek_bytes.slice(config.auth.key_bytes);
    return Jose.crypto.subtle.importKey("raw", bytes, config.id, false, purpose);
  });
  return [mac_key_promise, enc_key_promise];
};

/**
 * Converts the Jose web algorithms into data which is
 * useful for the Web Crypto API.
 *
 * length = in bits
 * bytes = in bytes
 */
var getCryptoConfig = function(alg) {
  switch (alg) {
    // Key encryption
    case "RSA-OAEP":
      return {
        jwe_name: "RSA-OAEP",
        id: {name: "RSA-OAEP", hash: {name: "SHA-1"}}
      };
    case "RSA-OAEP-256":
      return {
        jwe_name: "RSA-OAEP-256",
        id: {name: "RSA-OAEP", hash: {name: "SHA-256"}}
      };
    case "A128KW":
      return {
        jwe_name: "A128KW",
        id: {name: "AES-KW", length: 128}
      };
    case "A256KW":
      return {
        jwe_name: "A256KW",
        id: {name: "AES-KW", length: 256}
      };
    case "dir":
      return {
        jwe_name: "dir"
      };

    // Content encryption
    case "A128CBC-HS256":
      return {
        jwe_name: "A128CBC-HS256",
        id: {name: "AES-CBC", length: 128},
        iv_bytes: 16,
        specific_cek_bytes: 32,
        auth: {
          key_bytes: 16,
          id: {name: "HMAC", hash: {name: "SHA-256"}},
          truncated_bytes: 16
        }
      };
    case "A256CBC-HS512":
      return {
        jwe_name: "A256CBC-HS512",
        id: {name: "AES-CBC", length: 256},
        iv_bytes: 16,
        specific_cek_bytes: 64,
        auth: {
          key_bytes: 32,
          id: {name: "HMAC", hash: {name: "SHA-512"}},
          truncated_bytes: 32
        }
      };
    case "A128GCM":
      return {
        jwe_name: "A128GCM",
        id: {name: "AES-GCM", length: 128},
        iv_bytes: 12,
        auth: {
          aead: true,
          tag_bytes: 16
        }
      };
    case "A256GCM":
      return {
        jwe_name: "A256GCM",
        id: {name: "AES-GCM", length: 256},
        iv_bytes: 12,
        auth: {
          aead: true,
          tag_bytes: 16
        }
      };
    default:
      throw Error("unsupported algorithm: " + alg);
  }
};

/**
 * Computes a truncated MAC.
 *
 * @param config              configuration
 * @param mac_key_promise     Promise<CryptoKey>  mac key
 * @param aad                 Uint8Array
 * @param iv                  Uint8Array
 * @param cipher_text         Uint8Array
 * @return Promise<buffer>    truncated MAC
 */
var truncatedMac = function(config, mac_key_promise, aad, iv, cipher_text) {
  return mac_key_promise.then(function(mac_key) {
    var al = new Uint8Array(Utils.arrayFromInt32(aad.length * 8));
    var al_full = new Uint8Array(8);
    al_full.set(al, 4);
    var buf = Utils.arrayBufferConcat(aad, iv, cipher_text, al_full);
    return Jose.crypto.subtle.sign(config.auth.id, mac_key, buf).then(function(bytes) {
      return bytes.slice(0, config.auth.truncated_bytes);
    });
  });
};

/**
 * Converts the Jose web algorithms into data which is
 * useful for the Web Crypto API.
 */
var getSignConfig = function(alg) {

  switch (alg) {
    case "RS256":
      return {
        jwa_name: "RS256",
        id: {name: "RSASSA-PKCS1-v1_5", hash: {name: "SHA-256"}}
      };
    case "RS384":
      return {
        jwa_name: "RS384",
        id: {name: "RSASSA-PKCS1-v1_5", hash: {name: "SHA-384"}}
      };
    case "RS512":
      return {
        jwa_name: "RS512",
        id: {name: "RSASSA-PKCS1-v1_5", hash: {name: "SHA-512"}}
      };
    case "PS256":
      return {
        jwa_name: "PS256",
        id: {name: "RSA-PSS", hash: {name: "SHA-256"}, saltLength: 20}
      };
    case "PS384":
      return {
        jwa_name: "PS384",
        id: {name: "RSA-PSS", hash: {name: "SHA-384"}, saltLength: 20}
      };
    case "PS512":
      return {
        jwa_name: "PS512",
        id: {name: "RSA-PSS", hash: {name: "SHA-512"}, saltLength: 20}
      };
    case "HS256":
      return {
        jwa_name: "HS256",
        id: {name: "HMAC", hash: {name: "SHA-256"}}
      };
    case "HS384":
      return {
        jwa_name: "HS384",
        id: {name: "HMAC", hash: {name: "SHA-384"}}
      };
    case "HS512":
      return {
        jwa_name: "HS512",
        id: {name: "HMAC", hash: {name: "SHA-512"}}
      };
    case "ES256":
      return {
        jwa_name: "ES256",
        id: {name: "ECDSA", hash: {name: "SHA-256"}}
      };
    case "ES384":
      return {
        jwa_name: "ES384",
        id: {name: "ECDSA", hash: {name: "SHA-384"}}
      };
    case "ES512":
      return {
        jwa_name: "ES512",
        id: {name: "ECDSA", hash: {name: "SHA-512"}}
      };
    default:
      throw Error("unsupported algorithm: " + alg);
  }
};

/**
 * Returns JWA name for a given CryptoKey
 * @param key CryptoKey
 */
var getJwaNameForSignKey = function(key) {

  var rv = "",
    sign_algo = key.algorithm.name,
    hash_algo = key.algorithm.hash.name;

  if(sign_algo == "RSASSA-PKCS1-v1_5") {
    rv = "R";
  } else if(sign_algo == "RSA-PSS") {
    rv = "P";
  } else {
    throw new Error("unsupported sign/verify algorithm " + sign_algo);
  }

  if(hash_algo.indexOf("SHA-") === 0) {
    rv += "S";
  } else {
    throw new Error("unsupported hash algorithm " + sign_algo);
  }

  rv += hash_algo.substring(4);

  return rv;
};

/**
 * Derives key usage from algorithm's name
 *
 * @param alg String algorithm name
 * @returns {*}
 */
var getKeyUsageByAlg = function(alg) {

  switch (alg) {
    // signature
    case "RS256":
    case "RS384":
    case "RS512":
    case "PS256":
    case "PS384":
    case "PS512":
    case "HS256":
    case "HS384":
    case "HS512":
    case "ES256":
    case "ES384":
    case "ES512":
      return {
        publicKey: "verify",
        privateKey: "sign"
      };
    // key encryption
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "A128KW":
    case "A256KW":
      return {
        publicKey: "wrapKey",
        privateKey: "unwrapKey"
      };
    default:
      throw Error("unsupported algorithm: " + alg);
  }
};

/*-
 * Copyright 2014 Square Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Handles encryption.
 *
 * @param cryptographer  an instance of WebCryptographer (or equivalent).
 * @param key_promise    Promise<CryptoKey>, either RSA or shared key
 */
JoseJWE.Encrypter = function(cryptographer, key_promise) {
  this.cryptographer = cryptographer;
  this.key_promise = key_promise;
  this.userHeaders = {};
};

/**
 * Adds a key/value pair which will be included in the header.
 *
 * The data lives in plaintext (an attacker can read the header) but is tamper
 * proof (an attacker cannot modify the header).
 *
 * Note: some headers have semantic implications. E.g. if you set the "zip"
 * header, you are responsible for properly compressing plain_text before
 * calling encrypt().
 *
 * @param k  String
 * @param v  String
 */
JoseJWE.Encrypter.prototype.addHeader = function(k, v) {
  this.userHeaders[k] = v;
};

/**
 * Performs encryption.
 *
 * @param plain_text  utf-8 string
 * @return Promise<String>
 */
JoseJWE.Encrypter.prototype.encrypt = function(plain_text) {
  /**
   * Encrypts plain_text with CEK.
   *
   * @param cek_promise  Promise<CryptoKey>
   * @param plain_text   string
   * @return Promise<json>
   */
  var encryptPlainText = function(cek_promise, plain_text) {
    // Create header
    var headers = {};
    for (var i in this.userHeaders) {
      headers[i] = this.userHeaders[i];
    }
    headers.alg = this.cryptographer.getKeyEncryptionAlgorithm();
    headers.enc = this.cryptographer.getContentEncryptionAlgorithm();
    var jwe_protected_header = Utils.Base64Url.encode(JSON.stringify(headers));

    // Create the IV
    var iv = this.cryptographer.createIV();

    // Create the AAD
    var aad = Utils.arrayFromString(jwe_protected_header);
    plain_text = Utils.arrayFromUtf8String(plain_text);

    return this.cryptographer.encrypt(iv, aad, cek_promise, plain_text).then(function(r) {
      r.header = jwe_protected_header;
      r.iv = iv;
      return r;
    });
  };

  var cek_promise, encrypted_cek;

  if (this.cryptographer.getKeyEncryptionAlgorithm() == "dir") {
    // with direct encryption, this.key_promise provides the cek
    // and encrypted_cek is empty
    cek_promise = Promise.resolve(this.key_promise);
    encrypted_cek = [];
  } else {
    // Create a CEK key
    cek_promise = this.cryptographer.createCek();

    // Key & Cek allows us to create the encrypted_cek
    encrypted_cek = Promise.all([this.key_promise, cek_promise]).then(function (all) {
      var key = all[0];
      var cek = all[1];
      return this.cryptographer.wrapCek(cek, key);
    }.bind(this));
  }

  // Cek allows us to encrypy the plain text
  var enc_promise = encryptPlainText.bind(this, cek_promise, plain_text)();

  // Once we have all the promises, we can base64 encode all the pieces.
  return Promise.all([encrypted_cek, enc_promise]).then(function(all) {
    var encrypted_cek = all[0];
    var data = all[1];
    return data.header + "." +
      Utils.Base64Url.encodeArray(encrypted_cek) + "." +
      Utils.Base64Url.encodeArray(data.iv) + "." +
      Utils.Base64Url.encodeArray(data.cipher) + "." +
      Utils.Base64Url.encodeArray(data.tag);
  });
};



/*-
 * Copyright 2014 Square Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Jose = {};

/**
 * Javascript Object Signing and Encryption library.
 *
 * @author Alok Menghrajani <alok@squareup.com>
 */

/**
 * Initializes a JoseJWE object.
 */
var JoseJWE = {};

/**
 * Initializes a JoseJWS object.
 */
var JoseJWS = {};

/**
 * Set crypto provider to use (window.crypto, node-webcrypto-ossl, node-webcrypto-pkcs11 etc.).
 */
exports.setCrypto = function (cp) {
  Jose.crypto = cp;
};

/**
 * Default to the global "crypto" variable
 */
if (typeof(crypto) !== 'undefined') {
  exports.setCrypto(crypto);
}

/**
 * Use Node versions of atob, btoa functions outside the browser
 */
if (typeof atob !== "function") {
  atob = function (str) {
    return new Buffer(str, 'base64').toString('binary');
  };
}

if (typeof btoa !== "function") {
  btoa = function (str) {
    var buffer;
    if (str instanceof Buffer) {
      buffer = str;
    } else {
      buffer = new Buffer(str.toString(), 'binary');
    }
    return buffer.toString('base64');
  };
}

/**
 * Checks if we have all the required APIs.
 *
 * It might make sense to take a Cryptographer and delegate some of the checks
 * to the cryptographer. I however wanted to keep things simple, so I put all
 * the checks here for now.
 *
 * This list is generated manually and needs to be kept up-to-date.
 *
 * Casual testing shows that:
 * - things work in Chrome 40.0.2214.115
 * - things work in Firefox 35.0.1
 * - Safari 7.1.3 doesn't support JWK keys.
 * - Internet Explorer doesn't support Promises.
 *
 * Note: We don't check if the browser supports specific crypto operations.
 *       I.e. it's possible for this function to return true, but encryption or
 *       decryption to subsequently fail because the browser does not support a
 *       given encryption, decryption, key wrapping, key unwrapping or hmac
 *       operation.
 *
 * @return bool
 */
Jose.caniuse = function() {
  var r = true;

  // Promises/A+ (https://promisesaplus.com/)
  r = r && (typeof Promise == "function");
  r = r && (typeof Promise.reject == "function");
  r = r && (typeof Promise.prototype.then == "function");
  r = r && (typeof Promise.all == "function");

  // Crypto (http://www.w3.org/TR/WebCryptoAPI/)
  r = r && (typeof Jose.crypto == "object");
  r = r && (typeof Jose.crypto.subtle == "object");
  r = r && (typeof Jose.crypto.getRandomValues == "function");
  r = r && (typeof Jose.crypto.subtle.importKey == "function");
  r = r && (typeof Jose.crypto.subtle.generateKey == "function");
  r = r && (typeof Jose.crypto.subtle.exportKey == "function");
  r = r && (typeof Jose.crypto.subtle.wrapKey == "function");
  r = r && (typeof Jose.crypto.subtle.unwrapKey == "function");
  r = r && (typeof Jose.crypto.subtle.encrypt == "function");
  r = r && (typeof Jose.crypto.subtle.decrypt == "function");
  r = r && (typeof Jose.crypto.subtle.sign == "function");

  // ArrayBuffer (http://people.mozilla.org/~jorendorff/es6-draft.html#sec-arraybuffer-constructor)
  r = r && (typeof ArrayBuffer == "function");
  r = r && (typeof Uint8Array == "function" || typeof Uint8Array == "object"); // Safari uses "object"
  r = r && (typeof Uint32Array == "function" || typeof Uint32Array == "object"); // Safari uses "object"
  // skipping Uint32Array.prototype.buffer because https://people.mozilla.org/~jorendorff/es6-draft.html#sec-properties-of-the-%typedarrayprototype%-object

  // JSON (http://www.ecma-international.org/ecma-262/5.1/#sec-15.12.3)
  r = r && (typeof JSON == "object");
  r = r && (typeof JSON.parse == "function");
  r = r && (typeof JSON.stringify == "function");

  // Base64 (http://www.w3.org/TR/html5/webappapis.html#dom-windowbase64-atob)
  r = r && (typeof atob == "function");
  r = r && (typeof btoa == "function");

  // skipping Array functions (map, join, push, length, etc.)
  // skipping String functions (split, charCodeAt, fromCharCode, replace, etc.)
  // skipping regexp.test and parseInt

  return r;
};

/**
 * Feel free to override this function.
 */
Jose.assert = function(expr, msg) {
  if (!expr) {
    throw new Error(msg);
  }
};

exports.Jose = Jose;
exports.JoseJWE = JoseJWE;
exports.JoseJWS = JoseJWS;

