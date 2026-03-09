import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role?: {
    id: string;
    name: string;
  };
}

export interface UserRequest extends Request {
  user?: AuthenticatedUser;
  cookies: {
    access_token?: string;
  };
}
