// server.ts (or index.ts)
import "reflect-metadata"; 

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import {AppDataSource} from "../src/config/data-source"
import cookieParser from "cookie-parser";
import registrationRoutes from "./modules/register/registrationRoutes";
import authRoutes from "./modules/auth/authRoutes";
import adminroutes from "./modules/references/adminroutes";
import contactRoutes from "./modules/contact/contactRoutes";
import userRoute from "./modules/users/userRoute";


// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS setup

app.use(
  cors({
    origin: ["http://localhost:5173", "https://tzx-pool.vercel.app","https://c104-197-248-103-245.ngrok-free.app"], // allow dev + prod links 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Routes
app.use("/api", registrationRoutes)
app.use("/api/register", registrationRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/other", adminroutes)
app.use('/api/contact', contactRoutes);
app.use('/api/users', userRoute)
// Test route
app.get("/", (req, res) => {
  res.send("Hello, the API is working. GREAT!!");
});

// Start the server
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully with TypeORM!");
    // start your server only after DB connection
    app.listen(port, () => console.log(`Server running on port:${port}`));
  })
  .catch((error: unknown) => console.error("Database connection failed:", error));