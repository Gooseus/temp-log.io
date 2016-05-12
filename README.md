# temp-log.io
## A prototype ad-hoc logger service

### Installation

```
> git clone [ repo url ]
> cd [ repo folder ]
> npm install
> npm start
```

### Useage

1.  Go to localhost:5000 to see URL creation form
1.  Click Create button to get a new `/i/:uuid` URL
1.  Send requests to URL
1.  Go to `/o/:uuid` to see current log output

*Note*: Prototype uses in-memory data storage, so restarting the app will clear all URLs and logs

### To Do

* Output app should look like a log terminal and should use web sockets to receive new log pushes in realtime

### License

MIT
