import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import iamRoutes from "./routes/iamRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import authenticate from "./middleware/authenticate.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
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

