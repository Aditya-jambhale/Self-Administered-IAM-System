import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import iamRoutes from "./routes/iam.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import authenticate from "./middleware/auth.middleware.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = ["http://localhost:5173", "http://localhost:3000"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(cookieParser());// parsing the cookie
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IAM Backend Running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/iam", authenticate, iamRoutes);
app.use("/api", authenticate, resourceRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

export default app;

