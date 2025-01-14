const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
require("dotenv").config();

const app = express();

const {initialize} = require("./initialization/initialize")

const CORS_ALLOWED = process.env.ALLOWED_CORS

const corsConfig = {
    origin: CORS_ALLOWED.split(" "),
    methods: ["GET", "POST", "PUT", "DELETE"], // List only` available methods
    credentials: true, // Must be set to true
    allowedHeaders: ["Origin", "Content-Type", "X-Requested-With", "Accept", "Authorization"],
    credentials: true, // Allowed Headers to be received
};

app.use(cors(corsConfig));
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
      origin: process.env.ALLOWED_CORS.split(" "),
      methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    initialize();
    console.log("MongoDB Connected");
  })
  .catch((err) => console.log(err));
  

app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false, parameterLimit: 50000 }))
app.use(cookieParser());

app.use((req, res, next) => {
  req.io = io;
  next();
});
const activeUsers = new Map();

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("login", (id) => {
      let userId = id.toLowerCase()

        console.log(`User ${userId} attempting to log in`);

        if (activeUsers.has(userId)) {
            io.to(userId).emit("dual", {
                message: "Your account was accessed from another location. You have been logged out.",
            });
            console.log(`Emitted message to ${userId} dual log in`)
        }

        activeUsers.set(userId, socket);

        socket.join(userId);

        console.log(`User ${userId} added to the active users room`);
    });

});

// Routes
require("./routes")(app);


const port = process.env.PORT || 5001; // Dynamic port for deployment
server.listen(port, () => console.log(`Server is running on port: ${port}`));