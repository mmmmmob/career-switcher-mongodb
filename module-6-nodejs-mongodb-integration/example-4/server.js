import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import databaseClient from "./services/database.mjs";
import { checkMissingField } from "./utils/requestUtils.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;
const SALT = 10;

// setting initial configuration for upload file, web server (express), and cors
const upload = multer({ dest: "uploads/" });
dotenv.config();
const webServer = express();
webServer.use(cors());
webServer.use(express.json());

// HEALTH DATA
const MEMBER_DATA_KEYS = ["username", "password", "name", "age", "weight"];
const LOGIN_DATA_KEYS = ["username", "password"];

// server routes
webServer.get("/", (req, res) => res.send("This is user management system"));

webServer.get("/members", async (req, res) => {
  const members = await databaseClient
    .db()
    .collection("members")
    .find()
    .toArray();
  res.json(members);
});

webServer.post("/members", async (req, res) => {
  let body = req.body;
  const [isBodyChecked, missingFields] = checkMissingField(
    MEMBER_DATA_KEYS,
    body
  );
  if (!isBodyChecked) {
    res.send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }
  const saltRound = await bcrypt.genSalt(SALT);
  body["password"] = await bcrypt.hash(body["password"], saltRound);

  await databaseClient.db().collection("members").insertOne(body);
  res.send("Create User Successfully");
});

webServer.post("/login", async (req, res) => {
  let body = req.body;
  const [isBodyChecked, missingFields] = checkMissingField(
    LOGIN_DATA_KEYS,
    body
  );

  if (!isBodyChecked) {
    res.send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }

  const user = await databaseClient
    .db()
    .collection("members")
    .findOne({ username: body.username });
  if (user === null) {
    res.send("User not found");
    return;
  }
  // hash password
  if (!bcrypt.compareSync(body.password, user.password)) {
    res.send("Password is incorrect");
    return;
  }
  const returnUser = {
    _id: user._id,
    name: user.name,
    age: user.age,
    weight: user.weight,
  };
  res.json(returnUser);
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
