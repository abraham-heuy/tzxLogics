import { Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = (
  res: Response,
  userId: string,
  roleName: string // "mentee", "admin", "mentor"
): { accessToken: string; refreshToken: string } => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

  if (!jwtSecret || !refreshSecret) {
    throw new Error("JWT_SECRET or REFRESH_TOKEN_SECRET not defined");
  }

  const accessToken = jwt.sign({ userId, role: roleName }, jwtSecret, {
    expiresIn: "30m",
  });

  const refreshToken = jwt.sign({ userId }, refreshSecret, {
    expiresIn: "30d",
  });
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: true, // must be true for HTTPS
    sameSite: "none", // allow cross-origin
    maxAge: 30 * 60 * 1000,
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, refreshToken };
};

