const https = require("https");
const fs = require("fs");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const server = https.createServer(
  {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  },
  app
);

server.listen(PORT, () => {
  console.log(`Listening on port${PORT}...`);
});
