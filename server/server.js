import express from "express"
import "dotenv/config"
import cors from "cors"
import http from "http"
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/route.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: "*" }
});

export const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User Connected", userId);

  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // -------------------------------
  // 📞 CALL SIGNALING HANDLERS (ADD)
  // -------------------------------

  // caller → server → callee
  socket.on("call-user", (payload) => {
    const { toUserId } = payload;
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit("incoming-call", payload);
    } else {
      socket.emit("call-user-failed", { reason: "User offline" });
    }
  });

  // offer
  socket.on("webrtc-offer", (payload) => {
    const { toUserId } = payload;
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc-offer", payload);
    }
  });

  // answer
  socket.on("webrtc-answer", (payload) => {
    const { toUserId } = payload;
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc-answer", payload);
    }
  });

  // ice candidates
  socket.on("ice-candidate", (payload) => {
    const { toUserId } = payload;
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice-candidate", payload);
    }
  });

  // end call
  socket.on("end-call", (payload) => {
    const { toUserId } = payload;
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit("end-call", payload);
    }
  });

  // -------------------------------

  socket.on("disconnect", () => {
    console.log("User Disconnected", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

app.use(express.json({ limit: "4mb" }));
app.use(cors());
app.use("/api/status", (req, res) => res.send("Server is live"));

app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

await connectDB();
if(process.env.NODE_ENV !== "production" ){
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server is running on PORT: " + PORT));
}

export default server;
