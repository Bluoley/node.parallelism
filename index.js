const express = require("express");
const routes = require("./routes/routes");
const cors = require('cors');

const appCors = {
  origin: (requestOrigin, callback) => {
    callback(null, requestOrigin);
  },
  credentials: true,
};
const app = express();
app.use(cors(appCors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hire Me");
});

app.use("/api", routes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server is running on port 3000");
});
