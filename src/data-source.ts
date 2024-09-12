import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { ExpertProfile } from "./entity/ExpertProfile"
import { Role } from "./entity/Role"
import { UserHasRole } from "./entity/UserHasRole"
import { StoreProfile } from "./entity/StoreProfile"
import { Permission } from "./entity/Permission"
import { RoleHasPermission } from "./entity/RoleHasPermission"
import "dotenv/config"

// configuración de la base de datos (ver documentación de typeorm)
export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: false,
    entities: [User, ExpertProfile, Role, UserHasRole, StoreProfile, Permission, RoleHasPermission],
    migrations: [],
    subscribers: [],
})
