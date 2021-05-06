const http = require("http");
const https = require("https");
const { StringDecoder } = require("string_decoder");
const util = require("util");
const debug = util.debuglog("server");
const fs = require("fs");

const env = {
  httpPort: 3000,
  httpsPort: 3001,
};

const helpers = {
  parseJsonToObject: (str) => {
    try {
      var obj = JSON.parse(str);
      return obj;
    } catch (e) {
      return {};
    }
  },
};

const server = {};
server.httpServer = http.createServer(function (req, res) {
  req.protocol = "http";
  req.port = env.httpPort;
  server.unifiedServer(req, res);
});

const httpsServerOptions = {
  key: fs.readFileSync("./key.pem"),
  cert: fs.readFileSync("./cert.pem"),
};

server.httpsServer = https.createServer(
  httpsServerOptions,
  function (req, res) {
    req.protocol = "https";
    req.port = env.httpPort;
    server.unifiedServer(req, res);
  }
);

server.router = {
  ping: (data, callback) => {
    callback(200, { success: true });
  },
  notFound: (data, callback) => {
    callback(404);
  },
};

server.unifiedServer = (req, res) => {
  const parsedUrl = new URL(
    `${req.protocol}://localhost:${req.port}${req.url}`
  );
  const path = parsedUrl.pathname;
  const queryStringObject = parsedUrl.searchParams.toString().length
    ? JSON.parse(
        '{"' +
          decodeURI(parsedUrl.searchParams.toString())
            .replace(/"/g, '\\"')
            .replace(/&/g, '","')
            .replace(/=/g, '":"') +
          '"}'
      )
    : {};
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  const method = req.method.toLowerCase();
  const headers = req.headers;

  // get the payload, if any
  const decoder = new StringDecoder("utf-8");
  let payload = "";

  req.on("data", (data) => {
    payload += decoder.write(data);
  });

  req.on("end", () => {
    payload += decoder.end();

    const chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(payload),
    };
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof statusCode == "number" ? statusCode : 200;
      payload = typeof payload === "object" ? payload : {};
      const payloadStr = JSON.stringify(payload);

      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadStr);

      // If the response is 200, print green, otherwise print red
      if (statusCode == 200) {
        debug(
          "\x1b[32m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      } else {
        debug(
          "\x1b[31m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      }
    });
  });
};

server.init = () => {
  server.httpServer.listen(env.httpPort, () => {
    console.log(
      "\x1b[36m%s\x1b[0m",
      `server running at http://localhost:${env.httpPort}`
    );
  });
  server.httpsServer.listen(env.httpsPort, () => {
    console.log(
      "\x1b[32m%s\x1b[0m",
      `server running at https://localhost:${env.httpsPort}`
    );
  });
};

server.init();
