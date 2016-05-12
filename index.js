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
	config = __require("config.json"),

	app = express();

var logs = {};

app.set("port", process.env.PORT || config.port);
app.set("formHtml", config.formHtml);
app.set("outputHtml", config.outputHtml);
app.set("htmlDir", config.htmlDir);
app.set("idSize", config.idSize);
app.set("idType", config.idType);

app.set("defaultExpr", config.defaults.expr);
app.set("outLimit", config.defaults.limit);

app.use(bodyParser.json());

app.get("/", function(req, res) {
	// Deliver HTML logger creation form here
	res.sendFile(app.get("formHtml"), { root: __dirname + app.get("htmlDir") });
});

app.post("/", function(req,res) {
	const id = crypto.randomBytes(app.get("idSize")).toString(app.get("idType")),
		url = req.protocol+"://"+req.hostname+((app.get("port")!=80 && app.get("port")!=443) || (process.env.NODE_ENV == "production") ? ":"+app.get("port") : "") + "/i/" + id;

	res.send(url);

	logs[id] = {
		id: id,
		url: url,
		logs: [],
		expr: req.body.expr || app.get("defaultExpr"),
		limit: req.body.limit || app.get("outLimit")
	};
});

app.all("/i/:id", function inputLogHandler(req,res,next) {
	console.log("we get here??", req.params.id);

	const logger = logs[req.params.id];
	if(!logger) {
		return next();
	}

	req.time = new Date();

	const scope = lodash.pick(req, "time", "method", "url", "originalUrl", "body", "headers", "query", "params"),
		log = logger.expr.replace(/\{\{\s*(.*?)\s*\}\}/g, function(match,sub,offset,full) {
				return expressions.compile(sub)(scope);
			});

	logger.logs.push(log);
	res.status(200).send(log);

	while(logger.logs.length>logger.limit) {
		logger.logs.shift();
	}
});

app.get("/o/:id", function outputLogHandler(req,res,next) {
	// Deliver HTML logger reading app here
	const logger = logs[req.params.id];
	if(!logger) {
		return next();
	}

	if(req.xhr) {
		res.json(logger.logs);
	} else {
		res.sendFile(app.get("outputHtml"), { root: __dirname + app.get("htmlDir") });
	}
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

app.listen(app.get("port"), function expressAppListenHandler() { console.log("\nService running on port " + app.get("port") + "\n"); });
