import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import ErrorHandler from "../middlewares/error.js";
import routes from "../routes/index.js";
import cookieParser from "cookie-parser";
import { setupKioskSocket } from "../services/kiosks/sockets/kiosk-socket.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

setupKioskSocket(io);

app.set("trust proxy", 1);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/api", routes);

app.use(ErrorHandler);

export { app, io };
export default server;
