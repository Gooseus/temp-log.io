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
	app = express(),
	port = process.env.PORT || 5000,
	expr_default = "({{ time.toLocaleString('en-us') }}): {{ method }} - {{ url }}";

var logs = {};

app.set("port", port);
app.use(bodyParser.json());

app.get("/", function(req, res) {
	// Deliver HTML logger creation form here
	res.sendFile("form.html", { root: __dirname + '/public' });
});

app.post("/", function(req,res) {
	const hash = crypto.randomBytes(32).toString('hex'),
		url = req.protocol+"://"+req.hostname+((port!=80 && port!=443) ? ":"+port : "") + "/i/" + hash,
		logger = {
			hash: hash,
			url: url,
			expr: req.body.expr || expr_default,
			logs: [],
			limit: 10
		};

	res.send(url);

	logs[hash] = logger;
});

app.all("/i/:hash", function(req,res,next) {
	console.log("we get here??", req.params.hash);

	const logger = logs[req.params.hash];
	if(!logger) {
		return next();
	}

	req.time = new Date();

	const scope = lodash.pick(req, "time", "method", "url", "originalUrl", "body", "headers", "query", "params"),
		log = logger.expr.replace(/\{\{([^\}]+)\}\}/g, function(match,sub,offset,full) {
				return expressions.compile(sub)(scope);
			});

	logger.logs.push(log);
	res.status(200).send(log);

	while(logger.logs.length>logger.limit) {
		logger.logs.shift();
	}
});

app.get("/o/:hash", function(req,res,next) {
	// Deliver HTML logger reading app here
	const logger = logs[req.params.hash];
	if(!logger) {
		return next();
	}

	if(req.xhr) {
		res.json(logger.logs);
	} else {
		res.sendFile("output.html", { root: __dirname + '/public' });	
	}
});

app.all("*", function expressCatchAllHandler(req,res) {
	res.status(404).send("Not Found");
});

app.use(function expressErrorHandler(err, req, res, next) {
	if(!err.status) {
		console.error(err.stack);
	}

	res.status(err.status || 500).send(err.message);
});

app.listen(app.get("port"), function expressAppListenHandler() {
	console.log("");
	console.log("Service running on port: " + app.get("port"));
	console.log("");
});
