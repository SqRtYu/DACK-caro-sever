const jsonwebtoken = require("jsonwebtoken");
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const authConfig = require("../config/auth.json");
const { json } = require("express");

if (!authConfig.domain || !authConfig.audience) {
	throw new Error(
		"Please make sure that auth_config.json is in place and populated"
	);
}
const verifyAPI = jwt({
	secret: jwksRsa.expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
	}),
	audience: authConfig.audience,
	issuer: `https://${authConfig.domain}/`,
	algorithms: ["RS256"],
});

const verifySocket = (socket, next) => {
	console.log("verify");
	if (socket.handshake.query && socket.handshake.query.token) {
		const token = socket.handshake.query.token;
		jwksRsa({
			cache: true,
			rateLimit: true,
			jwksRequestsPerMinute: 5,
			jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
		}).getSigningKeys((err, keys) => {
			if (err) return next(new Error("Authentication error"));
			else {
				try {
					jsonwebtoken.verify(token, keys[0].getPublicKey(), {
						audience: authConfig.audience,
						issuer: `https://${authConfig.domain}/`,
						algorithms: ["RS256"],
					});
				} catch (err) {
					console.log(err);
					return next(new Error("Authentication error"));
				}
			}
		});

		return next();
	} else return next(new Error("Authentication error"));
};

module.exports = { verifyAPI, verifySocket };
