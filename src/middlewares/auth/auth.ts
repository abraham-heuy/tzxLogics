import asyncHandler from "../../middlewares/handlers/asyncHandler";
import { UserRequest } from "../../util/types/authUser";
import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/User";

export const protect = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1️⃣ Check Authorization header
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // 2️⃣ Otherwise, check cookies
  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  // 3️⃣ If no token found
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in env");
    }

    // 4️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };

    // 5️⃣ Get user with role directly 
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId },
      relations: ["role"], // direct relation
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

  // 6️⃣ Attach to request with role name
  req.user = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role ? { id: user.role.id.toString(), name: user.role.name } : undefined,
  };

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err);
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
});
