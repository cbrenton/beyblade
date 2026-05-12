class f extends Error {
  constructor(e, t) {
    super(e), this.oauth2Code = t;
  }
}
class k extends f {
  constructor(e, t, o, r) {
    super(e, t), this.httpCode = o.status, this.response = o, this.parsedBody = r;
  }
}
class g {
  constructor(e) {
    this.client = e;
  }
  /**
   * Returns the URi that the user should open in a browser to initiate the
   * authorization_code flow.
   */
  async getAuthorizeUri(e) {
    const [
      t,
      o
    ] = await Promise.all([
      e.codeVerifier ? y(e.codeVerifier) : void 0,
      this.client.getEndpoint("authorizationEndpoint")
    ]), r = new URLSearchParams({
      client_id: this.client.settings.clientId,
      response_type: "code",
      redirect_uri: e.redirectUri
    });
    if (t && (r.set("code_challenge_method", t[0]), r.set("code_challenge", t[1])), e.state && r.set("state", e.state), e.scope && r.set("scope", e.scope.join(" ")), e.resource) for (const n of [].concat(e.resource))
      r.append("resource", n);
    if (e.responseMode && e.responseMode !== "query" && r.append("response_mode", e.responseMode), e.extraParams) for (const [n, i] of Object.entries(e.extraParams)) {
      if (r.has(n)) throw new Error(`Property in extraParams would overwrite standard property: ${n}`);
      r.set(n, i);
    }
    return o + "?" + r.toString();
  }
  async getTokenFromCodeRedirect(e, t) {
    const { code: o } = this.validateResponse(e, {
      state: t.state
    });
    return this.getToken({
      code: o,
      redirectUri: t.redirectUri,
      codeVerifier: t.codeVerifier
    });
  }
  /**
   * After the user redirected back from the authorization endpoint, the
   * url will contain a 'code' and other information.
   *
   * This function takes the url and validate the response. If the user
   * redirected back with an error, an error will be thrown.
   */
  validateResponse(e, t) {
    e = new URL(e);
    let o = e.searchParams;
    if (!o.has("code") && !o.has("error") && e.hash.length > 0 && (o = new URLSearchParams(e.hash.slice(1))), o.has("error"))
      throw new f(
        o.get("error_description") ?? "OAuth2 error",
        o.get("error")
      );
    if (!o.has("code")) throw new Error(`The url did not contain a code parameter ${e}`);
    if (t.state && t.state !== o.get("state"))
      throw new Error(`The "state" parameter in the url did not match the expected value of ${t.state}`);
    return {
      code: o.get("code"),
      scope: o.has("scope") ? o.get("scope").split(" ") : void 0
    };
  }
  /**
   * Receives an OAuth2 token using 'authorization_code' grant
   */
  async getToken(e) {
    const t = {
      grant_type: "authorization_code",
      code: e.code,
      redirect_uri: e.redirectUri,
      code_verifier: e.codeVerifier,
      resource: e.resource
    };
    return this.client.tokenResponseToOAuth2Token(this.client.request("tokenEndpoint", t));
  }
}
async function A() {
  const s = await p(), e = new Uint8Array(32);
  return s.getRandomValues(e), w(e);
}
async function y(s) {
  const e = await p();
  return ["S256", w(await e.subtle.digest("SHA-256", _(s)))];
}
async function p() {
  var e;
  if (typeof window < "u" && window.crypto) {
    if (!((e = window.crypto.subtle) != null && e.digest))
      throw new Error(
        "The context/environment is not secure, and does not support the 'crypto.subtle' module. See: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/subtle for details"
      );
    return window.crypto;
  }
  return typeof self < "u" && self.crypto ? self.crypto : (await Promise.resolve().then(() => T)).webcrypto;
}
function _(s) {
  const e = new Uint8Array(s.length);
  for (let t = 0; t < s.length; t++)
    e[t] = s.charCodeAt(t) & 255;
  return e;
}
function w(s) {
  return btoa(String.fromCharCode(...new Uint8Array(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
class E {
  constructor(e) {
    this.serverMetadata = null, e != null && e.fetch || (e.fetch = fetch.bind(globalThis)), this.settings = e;
  }
  /**
   * Refreshes an existing token, and returns a new one.
   */
  async refreshToken(e, t) {
    if (!e.refreshToken)
      throw new Error("This token didn't have a refreshToken. It's not possible to refresh this");
    const o = {
      grant_type: "refresh_token",
      refresh_token: e.refreshToken
    };
    this.settings.clientSecret || (o.client_id = this.settings.clientId), t != null && t.scope && (o.scope = t.scope.join(" ")), t != null && t.resource && (o.resource = t.resource);
    const r = await this.tokenResponseToOAuth2Token(this.request("tokenEndpoint", o));
    return !r.refreshToken && e.refreshToken && (r.refreshToken = e.refreshToken), r;
  }
  /**
   * Retrieves an OAuth2 token using the client_credentials grant.
   */
  async clientCredentials(e) {
    var r;
    const t = ["client_id", "client_secret", "grant_type", "scope"];
    if (e != null && e.extraParams && Object.keys(e.extraParams).filter((n) => t.includes(n)).length > 0)
      throw new Error(`The following extraParams are disallowed: '${t.join("', '")}'`);
    const o = {
      grant_type: "client_credentials",
      scope: (r = e == null ? void 0 : e.scope) == null ? void 0 : r.join(" "),
      resource: e == null ? void 0 : e.resource,
      ...e == null ? void 0 : e.extraParams
    };
    if (!this.settings.clientSecret)
      throw new Error("A clientSecret must be provided to use client_credentials");
    return this.tokenResponseToOAuth2Token(this.request("tokenEndpoint", o));
  }
  /**
   * Retrieves an OAuth2 token using the 'password' grant'.
   */
  async password(e) {
    var o;
    const t = {
      grant_type: "password",
      ...e,
      scope: (o = e.scope) == null ? void 0 : o.join(" ")
    };
    return this.tokenResponseToOAuth2Token(this.request("tokenEndpoint", t));
  }
  /**
   * Returns the helper object for the `authorization_code` grant.
   */
  get authorizationCode() {
    return new g(
      this
    );
  }
  /**
   * Introspect a token
   *
   * This will give information about the validity, owner, which client
   * created the token and more.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc7662
   */
  async introspect(e) {
    const t = {
      token: e.accessToken,
      token_type_hint: "access_token"
    };
    return this.request("introspectionEndpoint", t);
  }
  /**
   * Revoke a token
   *
   * This will revoke a token, provided that the server supports this feature.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc7009
   */
  async revoke(e, t = "access_token") {
    let o = e.accessToken;
    t === "refresh_token" && (o = e.refreshToken);
    const r = {
      token: o,
      token_type_hint: t
    };
    return this.request("revocationEndpoint", r);
  }
  /**
   * Returns a url for an OAuth2 endpoint.
   *
   * Potentially fetches a discovery document to get it.
   */
  async getEndpoint(e) {
    if (this.settings[e] !== void 0)
      return h(this.settings[e], this.settings.server);
    if (e !== "discoveryEndpoint" && (await this.discover(), this.settings[e] !== void 0))
      return h(this.settings[e], this.settings.server);
    if (!this.settings.server)
      throw new Error(`Could not determine the location of ${e}. Either specify ${e} in the settings, or the "server" endpoint to let the client discover it.`);
    switch (e) {
      case "authorizationEndpoint":
        return h("/authorize", this.settings.server);
      case "tokenEndpoint":
        return h("/token", this.settings.server);
      case "discoveryEndpoint":
        return h("/.well-known/oauth-authorization-server", this.settings.server);
      case "introspectionEndpoint":
        return h("/introspect", this.settings.server);
      case "revocationEndpoint":
        return h("/revoke", this.settings.server);
    }
  }
  discover() {
    return this.discoveryPromise === void 0 && (this.discoveryPromise = this.doDiscover()), this.discoveryPromise;
  }
  /**
   * Fetches the OAuth2 discovery document
   *
   * Should not call this directly, call `discover()` instead
   */
  async doDiscover() {
    var r;
    let e;
    try {
      e = await this.getEndpoint("discoveryEndpoint");
    } catch {
      console.warn('[oauth2] OAuth2 discovery endpoint could not be determined. Either specify the "server" or "discoveryEndpoint');
      return;
    }
    const t = await this.settings.fetch(e, { headers: { Accept: "application/json" } });
    if (!t.ok) return;
    if (!((r = t.headers.get("Content-Type")) != null && r.startsWith("application/json"))) {
      console.warn("[oauth2] OAuth2 discovery endpoint was not a JSON response. Response is ignored");
      return;
    }
    this.serverMetadata = await t.json();
    const o = [
      ["authorization_endpoint", "authorizationEndpoint"],
      ["token_endpoint", "tokenEndpoint"],
      ["introspection_endpoint", "introspectionEndpoint"],
      ["revocation_endpoint", "revocationEndpoint"]
    ];
    if (this.serverMetadata !== null) {
      for (const [n, i] of o)
        this.serverMetadata[n] && (this.settings[i] = h(this.serverMetadata[n], e));
      if (this.serverMetadata.token_endpoint_auth_methods_supported && !this.settings.authenticationMethod) {
        for (const n of this.serverMetadata.token_endpoint_auth_methods_supported)
          if (n === "client_secret_basic" || n === "client_secret_post") {
            this.settings.authenticationMethod = n;
            break;
          }
      }
    }
  }
  async request(e, t) {
    const o = await this.getEndpoint(e), r = {
      "Content-Type": "application/x-www-form-urlencoded",
      // Although it shouldn't be needed, Github OAUth2 will return JSON
      // unless this is set.
      Accept: "application/json"
    };
    let n = this.settings.authenticationMethod;
    switch (this.settings.clientSecret || (n = "client_secret_post"), n || (n = "client_secret_basic_interop"), n) {
      case "client_secret_basic":
        r.Authorization = "Basic " + btoa(l(this.settings.clientId) + ":" + l(this.settings.clientSecret));
        break;
      case "client_secret_basic_interop":
        r.Authorization = "Basic " + btoa(this.settings.clientId.replace(/:/g, "%3A") + ":" + this.settings.clientSecret.replace(/:/g, "%3A"));
        break;
      case "client_secret_post":
        t.client_id = this.settings.clientId, this.settings.clientSecret && (t.client_secret = this.settings.clientSecret);
        break;
      default:
        throw new Error("Authentication method not yet supported:" + n + ". Open a feature request if you want this!");
    }
    const i = await this.settings.fetch(o, {
      method: "POST",
      body: v(t),
      headers: r
    });
    let c;
    if (i.status !== 204 && i.headers.has("Content-Type") && i.headers.get("Content-Type").match(/^application\/(.*\+)?json/) && (c = await i.json()), i.ok)
      return c;
    let a, d;
    throw c != null && c.error ? (a = "OAuth2 error " + c.error + ".", c.error_description && (a += " " + c.error_description), d = c.error) : (a = "HTTP Error " + i.status + " " + i.statusText, i.status === 401 && this.settings.clientSecret && (a += ". It's likely that the clientId and/or clientSecret was incorrect"), d = null), new k(a, d, i, c);
  }
  /**
   * Converts the JSON response body from the token endpoint to an OAuth2Token type.
   */
  async tokenResponseToOAuth2Token(e) {
    const t = await e;
    if (!(t != null && t.access_token))
      throw console.warn("Invalid OAuth2 Token Response: ", t), new TypeError("We received an invalid token response from an OAuth2 server.");
    const {
      access_token: o,
      refresh_token: r,
      expires_in: n,
      id_token: i,
      scope: c,
      token_type: a,
      ...d
    } = t, u = {
      accessToken: o,
      expiresAt: n ? Date.now() + n * 1e3 : null,
      refreshToken: r ?? null
    };
    return i && (u.idToken = i), c && (u.scope = c.split(" ")), Object.keys(d).length > 0 && (u.extraParams = d), u;
  }
}
function h(s, e) {
  return new URL(s, e).toString();
}
function v(s) {
  const e = new URLSearchParams();
  for (const [t, o] of Object.entries(s))
    if (Array.isArray(o))
      for (const r of o) e.append(t, r);
    else o !== void 0 && e.set(t, o.toString());
  return e.toString();
}
function l(s) {
  return encodeURIComponent(s).replace(/%20/g, "+").replace(/[-_.!~*'()]/g, (e) => `%${e.charCodeAt(0).toString(16).toUpperCase()}`);
}
class b {
  constructor(e) {
    this.token = null, this.activeGetStoredToken = null, this.activeRefresh = null, this.refreshTimer = null, (e == null ? void 0 : e.scheduleRefresh) === void 0 && (e.scheduleRefresh = !0), this.options = e, e.getStoredToken && (this.activeGetStoredToken = (async () => {
      this.token = await e.getStoredToken(), this.activeGetStoredToken = null;
    })()), this.scheduleRefresh();
  }
  /**
   * Does a fetch request and adds a Bearer / access token.
   *
   * If the access token is not known, this function attempts to fetch it
   * first. If the access token is almost expiring, this function might attempt
   * to refresh it.
   */
  async fetch(e, t) {
    const o = new Request(e, t);
    return this.mw()(
      o,
      (r) => fetch(r)
    );
  }
  /**
   * This function allows the fetch-mw to be called as more traditional
   * middleware.
   *
   * This function returns a middleware function with the signature
   *    (request, next): Response
   */
  mw() {
    return async (e, t) => {
      const o = await this.getAccessToken();
      let r = e.clone();
      r.headers.set("Authorization", "Bearer " + o);
      let n = await t(r);
      if (!n.ok && n.status === 401) {
        const i = await this.refreshToken();
        r = e.clone(), r.headers.set("Authorization", "Bearer " + i.accessToken), n = await t(r);
      }
      return n;
    };
  }
  /**
   * Returns current token information.
   *
   * There result object will have:
   *   * accessToken
   *   * expiresAt - when the token expires, or null.
   *   * refreshToken - may be null
   *
   * This function will attempt to automatically refresh if stale.
   */
  async getToken() {
    return this.token && (this.token.expiresAt === null || this.token.expiresAt > Date.now()) ? this.token : this.refreshToken();
  }
  /**
   * Returns an access token.
   *
   * If the current access token is not known, it will attempt to fetch it.
   * If the access token is expiring, it will attempt to refresh it.
   */
  async getAccessToken() {
    return await this.activeGetStoredToken, (await this.getToken()).accessToken;
  }
  /**
   * Forces an access token refresh
   */
  async refreshToken() {
    var t, o;
    if (this.activeRefresh)
      return this.activeRefresh;
    const e = this.token;
    this.activeRefresh = (async () => {
      var n, i;
      let r = null;
      try {
        e != null && e.refreshToken && (r = await this.options.client.refreshToken(e));
      } catch {
        console.warn("[oauth2] refresh token not accepted, we'll try reauthenticating");
      }
      if (r || (r = await this.options.getNewToken()), !r) {
        const c = new Error("Unable to obtain OAuth2 tokens, a full reauth may be needed");
        throw (i = (n = this.options).onError) == null || i.call(n, c), c;
      }
      return r;
    })();
    try {
      const r = await this.activeRefresh;
      return this.token = r, (o = (t = this.options).storeToken) == null || o.call(t, r), this.scheduleRefresh(), r;
    } catch (r) {
      throw this.options.onError && this.options.onError(r), r;
    } finally {
      this.activeRefresh = null;
    }
  }
  scheduleRefresh() {
    var t;
    if (!this.options.scheduleRefresh || (this.refreshTimer && (clearTimeout(this.refreshTimer), this.refreshTimer = null), !((t = this.token) != null && t.expiresAt) || !this.token.refreshToken))
      return;
    const e = this.token.expiresAt - Date.now();
    e < 120 * 1e3 || (this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (o) {
        console.error("[fetch-mw-oauth2] error while doing a background OAuth2 auto-refresh", o);
      }
    }, e - 60 * 1e3));
  }
}
const T = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
export {
  g as OAuth2AuthorizationCodeClient,
  E as OAuth2Client,
  f as OAuth2Error,
  b as OAuth2Fetch,
  k as OAuth2HttpError,
  A as generateCodeVerifier
};
