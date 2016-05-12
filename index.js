"use strict";

global.__require = function(name) {
	return require(__dirname + "/" + name);
};

const Promise = require("bluebird"),
	crypto = require("crypto"),
	express = require("express"),
	bodyParser = require("body-parser"),
	expressions = require("angular-expressions"),
	lodash = require("lodash"),
	Redis = require("ioredis"),
	config = __require("config.json"),

	redis = new Redis(process.env.REDIS_URL || "localhost"),
	app = express();

expressions.filters.stringify = input => JSON.stringify(input);
expressions.filters.prettyStringify = input => JSON.stringify(input,null,2);
expressions.filters.toLocale = (input,locale,tz) => input.toLocaleString(locale || "en-us", { "timeZone": (tz || "America/New_York") });

app.set("redis", redis);
app.set("port", process.env.PORT || config.port);
// app.set("formHtml", config.formHtml);
app.set("outputHtml", config.outputHtml);
app.set("staticDir", config.staticDir);
app.set("idSize", config.idSize);
app.set("idType", config.idType);

app.set("defaultExpr", config.defaults.expr);
app.set("outLimit", config.defaults.limit);

app.use(express.static(app.get("staticDir")));
app.use(function(req,res,next) {
	if(req.body) {
		req.originalBody = req.body;
	}

	next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.get("/", function(req, res) {
// 	// Deliver HTML logger creation form here
// 	res.sendFile(app.get("formHtml"), { root: __dirname + app.get("staticDir") });
// });

app.post("/", function(req,res) {
	const id = crypto.randomBytes(app.get("idSize")).toString(app.get("idType")),
		url = req.protocol+"://" + req.hostname + (process.env.NODE_ENV != "production" ? ":"+app.get("port") : "") + "/i/" + id;

	res.send(url);

	const log = JSON.stringify({
					id: id,
					url: url,
					expr: req.body.expr || app.get("defaultExpr"),
					limit: req.body.limit || app.get("outLimit")
				});

	console.log("creating log", url, log);

	redis.set(`url-${id}`, log);
});

app.get("/o/:id", function outputLogHandler(req,res,next) {
	if(!req.xhr) {
		return res.sendFile(app.get("outputHtml"), { root: __dirname + '/' + app.get("staticDir") });
	}

	console.log(`getting log-${req.params.id}`);

	Promise.all([
		redis.get(`url-${req.params.id}`).then(JSON.parse),
		redis.lrange(`log-${req.params.id}`,0,-1)
	])
	.spread((log,entries) => res.json(lodash.extend(log, { entries: entries })))
	.catch((err) => {
		console.log("redis or json error", err);
		next(err);
	});
});

app.all("/i/:id", function inputLogHandler(req,res,next) {
	req.time = new Date();

	redis.get(`url-${req.params.id}`)
	.then(JSON.parse)
	.then((log) => {
		const scope = lodash.pick(req, "time", "method", "url", "originalUrl", "body", "originalBody", "headers", "query"),
			entry = log.expr.replace(/\{\{\s*(.*?)\s*\}\}/g, function compileStringSubExpressions(match,sub,offset,full) {
					return expressions.compile(sub)(scope);
				});

		return redis.rpush(`log-${log.id}`,entry)
					.then(function(len) {
						redis.set(`lastEntry-${log.id}`, Date.now());

						res.status(200).send(entry);

						console.log(`log ${log.id} now has ${len} entries.`);
						if(len>log.limit) {
							console.log(`trimming log ${log.id}`);
							redis.ltrim(`log-${log.id}`, -1*(log.limit-1), -1);
						}
					});
	})
	.catch((err) => {
		console.log("redis or json error", err);
		next(err);
	});
});

app.all("*", function expressCatchAllHandler(req,res) {
	res.status(404).send("Not Found");
});

app.use(function expressErrorHandler(err, req, res, next) {
	if(!err.status) {
		console.error(err.stack);
	}

	res.status(err.status || 500).send(err.message || "Server Error");
});

app.listen(app.get("port"), function expressAppListenHandler() {
	console.log("\nService running on port " + app.get("port") + "\n");
});
