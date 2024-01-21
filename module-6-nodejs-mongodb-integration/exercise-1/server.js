import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import databaseClient from "./services/database.mjs";
import { checkMissingField } from "./utils/requestUtils.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

// setting initial configuration for upload file, web server (express), and cors
const upload = multer({ dest: "uploads/" });
dotenv.config();
const webServer = express();
webServer.use(cors());
webServer.use(express.json());

// HEALTH DATA
const HEALTH_DATA_KEYS = [
  "duration",
  "distance",
  "average_heart_rate",
  "user_id",
];

// server routes
webServer.get("/", async (req, res) => {
  res.send("This is Health Management System");
});

webServer.get("/health", async (req, res) => {
  const healthData = await databaseClient
    .db()
    .collection("health-history")
    .find({})
    .toArray();
  res.json(healthData);
});

webServer.post("/health", async (req, res) => {
  let body = req.body;
  const [isBodyChecked, missingFields] = checkMissingField(
    HEALTH_DATA_KEYS,
    body
  );
  if (!isBodyChecked) {
    res.send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }

  body["user_id"] = new ObjectId(body.user_id);

  await databaseClient.db().collection("health-history").insertOne(body);
  res.send("Create health data successfully");
});

// initilize web server
const currentServer = webServer.listen(PORT, HOSTNAME, () => {
  console.log(
    `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
  );
  console.log(`SERVER IS ONLINE => http://${HOSTNAME}:${PORT}`);
});

const cleanup = () => {
  currentServer.close(() => {
    console.log(
      `DISCONNECT DATABASE: NAME => ${databaseClient.db().databaseName}`
    );
    try {
      databaseClient.close();
    } catch (error) {
      console.error(error);
    }
  });
};

// cleanup connection such as database
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
