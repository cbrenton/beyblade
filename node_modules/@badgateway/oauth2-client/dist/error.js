/**
 * An error class for any error the server emits.
 *
 * The 'oauth2Code' property will have the oauth2 error type,
 * such as:
 * - invalid_request
 * - invalid_client
 * - invalid_grant
 * - unauthorized_client
 * - unsupported_grant_type
 * - invalid_scope
 */
export class OAuth2Error extends Error {
    constructor(message, oauth2Code) {
        super(message);
        this.oauth2Code = oauth2Code;
    }
}
/**
 * A OAuth2 error that was emitted as a HTTP error
 *
 * The 'code' property will have the oauth2 error type,
 * such as:
 * - invalid_request
 * - invalid_client
 * - invalid_grant
 * - unauthorized_client
 * - unsupported_grant_type
 * - invalid_scope
 *
 * This Error also gives you access to the HTTP status code and response body.
 */
export class OAuth2HttpError extends OAuth2Error {
    constructor(message, oauth2Code, response, parsedBody) {
        super(message, oauth2Code);
        this.httpCode = response.status;
        this.response = response;
        this.parsedBody = parsedBody;
    }
}
//# sourceMappingURL=error.js.map