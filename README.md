# temp-log.io
## A prototype ad-hoc logger service

### Installation

#### Install Redis
[Read how here](http://redis.io/download), (**hint: you can use [homebrew](http://jasdeep.ca/2012/05/installing-redis-on-mac-os-x/) on Mac**)

#### Install Application
```
> git clone [ repo url ]
> cd [ repo folder ]
> npm install
```

### Running Locally

1.  Make sure you have the app and Redis installed (as per above)
1.  Start redis `> redis-server`
1.  Start app `> npm start`
1.  Go to [localhost:5000](http://localhost:5000/) to see URL creation form
1.  Click Create button to get a new `/i/:uuid` URL
1.  Send requests to URL via Postman or CURL or favorite HTTP client
1.  Go to `/o/:uuid` to see current log output

### To Do

* Convert front-end to Angular
* Output app should look like a log terminal
* Use web sockets to receive new log pushes in realtime, like tailing a real log
* Dynamic grep filter for log

### License

MIT
