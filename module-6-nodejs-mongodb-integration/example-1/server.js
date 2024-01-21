import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import multer from "multer";
import databaseClient from "./services/database.mjs";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

// setting initial configuration for upload file, web server (express), and cors
const upload = multer({ dest: "uploads/" });
dotenv.config();
const webServer = express();
webServer.use(cors());

// server routes
webServer.get("/", async (req, res) => {
  const data = await databaseClient
    .db()
    .collection("health")
    .find({}, { projection: { _id: 1, average_heart_rate: 1 } })
    .toArray();
  res.json(data);
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
