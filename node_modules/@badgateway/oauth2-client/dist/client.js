import { OAuth2HttpError } from "./error.js";
import { OAuth2AuthorizationCodeClient } from "./client/authorization-code.js";
export class OAuth2Client {
    constructor(clientSettings) {
        this.serverMetadata = null;
        if (!(clientSettings === null || clientSettings === void 0 ? void 0 : clientSettings.fetch)) {
            clientSettings.fetch = fetch.bind(globalThis);
        }
        this.settings = clientSettings;
    }
    /**
     * Refreshes an existing token, and returns a new one.
     */
    async refreshToken(token, params) {
        if (!token.refreshToken) {
            throw new Error('This token didn\'t have a refreshToken. It\'s not possible to refresh this');
        }
        const body = {
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
        };
        if (!this.settings.clientSecret) {
            // If there's no secret, send the clientId in the body.
            body.client_id = this.settings.clientId;
        }
        if (params === null || params === void 0 ? void 0 : params.scope)
            body.scope = params.scope.join(' ');
        if (params === null || params === void 0 ? void 0 : params.resource)
            body.resource = params.resource;
        const newToken = await this.tokenResponseToOAuth2Token(this.request('tokenEndpoint', body));
        if (!newToken.refreshToken && token.refreshToken) {
            // Reuse old refresh token if we didn't get a new one.
            newToken.refreshToken = token.refreshToken;
        }
        return newToken;
    }
    /**
     * Retrieves an OAuth2 token using the client_credentials grant.
     */
    async clientCredentials(params) {
        var _a;
        const disallowed = ['client_id', 'client_secret', 'grant_type', 'scope'];
        if ((params === null || params === void 0 ? void 0 : params.extraParams) && Object.keys(params.extraParams).filter((key) => disallowed.includes(key)).length > 0) {
            throw new Error(`The following extraParams are disallowed: '${disallowed.join("', '")}'`);
        }
        const body = {
            grant_type: 'client_credentials',
            scope: (_a = params === null || params === void 0 ? void 0 : params.scope) === null || _a === void 0 ? void 0 : _a.join(' '),
            resource: params === null || params === void 0 ? void 0 : params.resource,
            ...params === null || params === void 0 ? void 0 : params.extraParams
        };
        if (!this.settings.clientSecret) {
            throw new Error('A clientSecret must be provided to use client_credentials');
        }
        return this.tokenResponseToOAuth2Token(this.request('tokenEndpoint', body));
    }
    /**
     * Retrieves an OAuth2 token using the 'password' grant'.
     */
    async password(params) {
        var _a;
        const body = {
            grant_type: 'password',
            ...params,
            scope: (_a = params.scope) === null || _a === void 0 ? void 0 : _a.join(' '),
        };
        return this.tokenResponseToOAuth2Token(this.request('tokenEndpoint', body));
    }
    /**
     * Returns the helper object for the `authorization_code` grant.
     */
    get authorizationCode() {
        return new OAuth2AuthorizationCodeClient(this);
    }
    /**
     * Introspect a token
     *
     * This will give information about the validity, owner, which client
     * created the token and more.
     *
     * @see https://datatracker.ietf.org/doc/html/rfc7662
     */
    async introspect(token) {
        const body = {
            token: token.accessToken,
            token_type_hint: 'access_token',
        };
        return this.request('introspectionEndpoint', body);
    }
    /**
     * Revoke a token
     *
     * This will revoke a token, provided that the server supports this feature.
     *
     * @see https://datatracker.ietf.org/doc/html/rfc7009
     */
    async revoke(token, tokenTypeHint = 'access_token') {
        let tokenValue = token.accessToken;
        if (tokenTypeHint === 'refresh_token') {
            tokenValue = token.refreshToken;
        }
        const body = {
            token: tokenValue,
            token_type_hint: tokenTypeHint,
        };
        return this.request('revocationEndpoint', body);
    }
    /**
     * Returns a url for an OAuth2 endpoint.
     *
     * Potentially fetches a discovery document to get it.
     */
    async getEndpoint(endpoint) {
        if (this.settings[endpoint] !== undefined) {
            return resolve(this.settings[endpoint], this.settings.server);
        }
        if (endpoint !== 'discoveryEndpoint') {
            // This condition prevents infinite loops.
            await this.discover();
            if (this.settings[endpoint] !== undefined) {
                return resolve(this.settings[endpoint], this.settings.server);
            }
        }
        // If we got here it means we need to 'guess' the endpoint.
        if (!this.settings.server) {
            throw new Error(`Could not determine the location of ${endpoint}. Either specify ${endpoint} in the settings, or the "server" endpoint to let the client discover it.`);
        }
        switch (endpoint) {
            case 'authorizationEndpoint':
                return resolve('/authorize', this.settings.server);
            case 'tokenEndpoint':
                return resolve('/token', this.settings.server);
            case 'discoveryEndpoint':
                return resolve('/.well-known/oauth-authorization-server', this.settings.server);
            case 'introspectionEndpoint':
                return resolve('/introspect', this.settings.server);
            case 'revocationEndpoint':
                return resolve('/revoke', this.settings.server);
        }
    }
    discover() {
        // Never discover twice
        if (this.discoveryPromise === undefined) {
            this.discoveryPromise = this.doDiscover();
        }
        return this.discoveryPromise;
    }
    /**
     * Fetches the OAuth2 discovery document
     *
     * Should not call this directly, call `discover()` instead
     */
    async doDiscover() {
        var _a;
        let discoverUrl;
        try {
            discoverUrl = await this.getEndpoint('discoveryEndpoint');
        }
        catch (_err) {
            console.warn('[oauth2] OAuth2 discovery endpoint could not be determined. Either specify the "server" or "discoveryEndpoint');
            return;
        }
        const resp = await this.settings.fetch(discoverUrl, { headers: { Accept: 'application/json' } });
        if (!resp.ok)
            return;
        if (!((_a = resp.headers.get('Content-Type')) === null || _a === void 0 ? void 0 : _a.startsWith('application/json'))) {
            console.warn('[oauth2] OAuth2 discovery endpoint was not a JSON response. Response is ignored');
            return;
        }
        this.serverMetadata = await resp.json();
        const urlMap = [
            ['authorization_endpoint', 'authorizationEndpoint'],
            ['token_endpoint', 'tokenEndpoint'],
            ['introspection_endpoint', 'introspectionEndpoint'],
            ['revocation_endpoint', 'revocationEndpoint'],
        ];
        if (this.serverMetadata === null)
            return;
        for (const [property, setting] of urlMap) {
            if (!this.serverMetadata[property])
                continue;
            this.settings[setting] = resolve(this.serverMetadata[property], discoverUrl);
        }
        if (this.serverMetadata.token_endpoint_auth_methods_supported
            && !this.settings.authenticationMethod) {
            for (const method of this.serverMetadata.token_endpoint_auth_methods_supported) {
                if (method === 'client_secret_basic' || method === 'client_secret_post') {
                    this.settings.authenticationMethod = method;
                    break;
                }
            }
        }
    }
    async request(endpoint, body) {
        const uri = await this.getEndpoint(endpoint);
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            // Although it shouldn't be needed, Github OAUth2 will return JSON
            // unless this is set.
            'Accept': 'application/json',
        };
        let authMethod = this.settings.authenticationMethod;
        if (!this.settings.clientSecret) {
            // Basic auth should only be used when there's a client_secret, for
            // non-confidential clients we may only have a client_id, which
            // always gets added to the body.
            authMethod = 'client_secret_post';
        }
        if (!authMethod) {
            // If we got here, it means no preference was provided by anything,
            // and we have a secret. In this case its preferred to embed
            // authentication in the Authorization header.
            authMethod = 'client_secret_basic_interop';
        }
        switch (authMethod) {
            case 'client_secret_basic':
                // Per RFC 6749 section 2.3.1, the client_id and client_secret need
                // to be encoded using application/x-www-form-urlencoded for the
                // basic auth.
                headers.Authorization = 'Basic ' +
                    btoa(legacyFormUrlEncode(this.settings.clientId) + ':' + legacyFormUrlEncode(this.settings.clientSecret));
                break;
            case 'client_secret_basic_interop':
                // A more relaxed encoding that's more compatible with popular servers.
                headers.Authorization = 'Basic ' +
                    btoa(this.settings.clientId.replace(/:/g, '%3A') + ':' + this.settings.clientSecret.replace(/:/g, '%3A'));
                break;
            case 'client_secret_post':
                body.client_id = this.settings.clientId;
                if (this.settings.clientSecret) {
                    body.client_secret = this.settings.clientSecret;
                }
                break;
            default:
                throw new Error('Authentication method not yet supported:' + authMethod + '. Open a feature request if you want this!');
        }
        const resp = await this.settings.fetch(uri, {
            method: 'POST',
            body: generateQueryString(body),
            headers,
        });
        let responseBody;
        if (resp.status !== 204 && resp.headers.has('Content-Type') && resp.headers.get('Content-Type').match(/^application\/(.*\+)?json/)) {
            responseBody = await resp.json();
        }
        if (resp.ok) {
            return responseBody;
        }
        let errorMessage;
        let oauth2Code;
        if (responseBody === null || responseBody === void 0 ? void 0 : responseBody.error) {
            // This is likely an OAUth2-formatted error
            errorMessage = 'OAuth2 error ' + responseBody.error + '.';
            if (responseBody.error_description) {
                errorMessage += ' ' + responseBody.error_description;
            }
            oauth2Code = responseBody.error;
        }
        else {
            errorMessage = 'HTTP Error ' + resp.status + ' ' + resp.statusText;
            if (resp.status === 401 && this.settings.clientSecret) {
                errorMessage += '. It\'s likely that the clientId and/or clientSecret was incorrect';
            }
            oauth2Code = null;
        }
        throw new OAuth2HttpError(errorMessage, oauth2Code, resp, responseBody);
    }
    /**
     * Converts the JSON response body from the token endpoint to an OAuth2Token type.
     */
    async tokenResponseToOAuth2Token(resp) {
        const body = await resp;
        if (!(body === null || body === void 0 ? void 0 : body.access_token)) {
            console.warn('Invalid OAuth2 Token Response: ', body);
            throw new TypeError('We received an invalid token response from an OAuth2 server.');
        }
        const { access_token, refresh_token, expires_in, id_token, scope, token_type, ...extraParams } = body;
        const result = {
            accessToken: access_token,
            expiresAt: expires_in ? Date.now() + (expires_in * 1000) : null,
            refreshToken: refresh_token !== null && refresh_token !== void 0 ? refresh_token : null,
        };
        if (id_token) {
            result.idToken = id_token;
        }
        if (scope) {
            result.scope = scope.split(' ');
        }
        if (Object.keys(extraParams).length > 0) {
            result.extraParams = extraParams;
        }
        return result;
    }
}
function resolve(uri, base) {
    return new URL(uri, base).toString();
}
/**
 * Generates a query string.
 *
 * If a value is undefined, it will be ignored.
 * If a value is an array, it will add the parameter multiple times for each array value.
 */
export function generateQueryString(params) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (Array.isArray(v)) {
            for (const vItem of v)
                query.append(k, vItem);
        }
        else if (v !== undefined)
            query.set(k, v.toString());
    }
    return query.toString();
}
/**
 * Encodes string according to the most strict interpretation of RFC 6749 Appendix B.
 *
 * All non-alphanumeric characters are percent encoded, with exception of space which
 * is replaced with '+'.
 */
export function legacyFormUrlEncode(value) {
    return encodeURIComponent(value)
        .replace(/%20/g, '+')
        .replace(/[-_.!~*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
//# sourceMappingURL=client.js.map