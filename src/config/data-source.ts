import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { Role } from "../entities/Role";
import { User } from "../entities/User";
import { Investment } from "../entities/Investment";
import { SupportTicket } from "../entities/SupportTicket";
import { ContactMessage } from "../entities/ContactMessage";

dotenv.config();

export const AppDataSource = new DataSource({ 
    type: "postgres",
    url: process.env.DB_URL,  
    entities: [
        Role,
        User,
        Investment,
        SupportTicket, 
        ContactMessage
    ],
    migrations: [process.env.NODE_ENV === 'production' ? "dist/migrations/*.js" : "src/migrations/*.ts"],
    synchronize: false,
    logging: false,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});