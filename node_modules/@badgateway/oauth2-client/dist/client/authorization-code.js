import { OAuth2Error } from "../error.js";
export class OAuth2AuthorizationCodeClient {
    constructor(client) {
        this.client = client;
    }
    /**
     * Returns the URi that the user should open in a browser to initiate the
     * authorization_code flow.
     */
    async getAuthorizeUri(params) {
        const [codeChallenge, authorizationEndpoint] = await Promise.all([
            params.codeVerifier ? getCodeChallenge(params.codeVerifier) : undefined,
            this.client.getEndpoint('authorizationEndpoint')
        ]);
        const query = new URLSearchParams({
            client_id: this.client.settings.clientId,
            response_type: 'code',
            redirect_uri: params.redirectUri,
        });
        if (codeChallenge) {
            query.set('code_challenge_method', codeChallenge[0]);
            query.set('code_challenge', codeChallenge[1]);
        }
        if (params.state) {
            query.set('state', params.state);
        }
        if (params.scope) {
            query.set('scope', params.scope.join(' '));
        }
        if (params.resource)
            for (const resource of [].concat(params.resource)) {
                query.append('resource', resource);
            }
        if (params.responseMode && params.responseMode !== 'query') {
            query.append('response_mode', params.responseMode);
        }
        if (params.extraParams)
            for (const [k, v] of Object.entries(params.extraParams)) {
                if (query.has(k))
                    throw new Error(`Property in extraParams would overwrite standard property: ${k}`);
                query.set(k, v);
            }
        return authorizationEndpoint + '?' + query.toString();
    }
    async getTokenFromCodeRedirect(url, params) {
        const { code } = this.validateResponse(url, {
            state: params.state
        });
        return this.getToken({
            code,
            redirectUri: params.redirectUri,
            codeVerifier: params.codeVerifier,
        });
    }
    /**
     * After the user redirected back from the authorization endpoint, the
     * url will contain a 'code' and other information.
     *
     * This function takes the url and validate the response. If the user
     * redirected back with an error, an error will be thrown.
     */
    validateResponse(url, params) {
        var _a;
        url = new URL(url);
        let queryParams = url.searchParams;
        if (!queryParams.has('code') && !queryParams.has('error') && url.hash.length > 0) {
            // Try the fragment
            queryParams = new URLSearchParams(url.hash.slice(1));
        }
        if (queryParams.has('error')) {
            throw new OAuth2Error((_a = queryParams.get('error_description')) !== null && _a !== void 0 ? _a : 'OAuth2 error', queryParams.get('error'));
        }
        if (!queryParams.has('code'))
            throw new Error(`The url did not contain a code parameter ${url}`);
        if (params.state && params.state !== queryParams.get('state')) {
            throw new Error(`The "state" parameter in the url did not match the expected value of ${params.state}`);
        }
        return {
            code: queryParams.get('code'),
            scope: queryParams.has('scope') ? queryParams.get('scope').split(' ') : undefined,
        };
    }
    /**
     * Receives an OAuth2 token using 'authorization_code' grant
     */
    async getToken(params) {
        const body = {
            grant_type: 'authorization_code',
            code: params.code,
            redirect_uri: params.redirectUri,
            code_verifier: params.codeVerifier,
            resource: params.resource,
        };
        return this.client.tokenResponseToOAuth2Token(this.client.request('tokenEndpoint', body));
    }
}
export async function generateCodeVerifier() {
    const webCrypto = await getWebCrypto();
    const arr = new Uint8Array(32);
    webCrypto.getRandomValues(arr);
    return base64Url(arr);
}
export async function getCodeChallenge(codeVerifier) {
    const webCrypto = await getWebCrypto();
    return ['S256', base64Url(await webCrypto.subtle.digest('SHA-256', stringToBuffer(codeVerifier)))];
}
async function getWebCrypto() {
    var _a;
    // Browsers
    if ((typeof window !== 'undefined' && window.crypto)) {
        if (!((_a = window.crypto.subtle) === null || _a === void 0 ? void 0 : _a.digest)) {
            throw new Error("The context/environment is not secure, and does not support the 'crypto.subtle' module. See: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/subtle for details");
        }
        return window.crypto;
    }
    // Web workers possibly
    if ((typeof self !== 'undefined' && self.crypto)) {
        return self.crypto;
    }
    // Node
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = await import('crypto');
    return crypto.webcrypto;
}
function stringToBuffer(input) {
    const buf = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
        buf[i] = input.charCodeAt(i) & 0xFF;
    }
    return buf;
}
function base64Url(buf) {
    return (btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''));
}
//# sourceMappingURL=authorization-code.js.map