import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { User } from "../entity/User"
import { UserHasRoleController } from "./UserHasRoleController";
import { RoleController } from "./RoleController";
import { v4 as uuidv4, v6 as uuidv6 } from 'uuid';
import "dotenv/config"
import axios from "axios"

const path = require("path")
const nodeMailer = require("nodemailer")
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const jwt = require("jsonwebtoken")
const validator = require("validator")

export class UserController {

    private userRepository = AppDataSource.getRepository(User)
    private roleController = new RoleController
    private userHasRoleController = new UserHasRoleController

    async all(req:Request, res: Response) {
        const authHeader = req.headers.authorization;
        let excludeUserId = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
            excludeUserId = decoded.id; // Assuming the token contains a payload with 'id'
        }
        const stores = req.query.s === "true"
        const experts = req.query.e === "true"
        const withRoles = req.query.wr === "true"
        const withStoreProfile = req.query.ws === "true"
        const withExpertProfile = req.query.we === "true"
        const pending = req.query.pending === "true";
        const count = req.query.count === "true";
        
        const queryBuilder = this.userRepository.createQueryBuilder("user")

        if (withStoreProfile) {
            queryBuilder.leftJoinAndSelect("user.storeProfile", "storeProfile")
        }  
        if (withExpertProfile) {
            queryBuilder.leftJoinAndSelect("user.expertProfile", "expertProfile");  
        }

        if (withRoles) {
            queryBuilder.leftJoinAndSelect("user.userHasRole", "userHasRole") 
            .leftJoinAndSelect("userHasRole.role", "role") 
            .leftJoinAndSelect("role.roleHasPermission", "roleHasPermission")
            .leftJoinAndSelect("roleHasPermission.permission", "permission")
        }

        if (stores && experts){
            queryBuilder.leftJoinAndSelect("user.storeProfile", "storeProfile")
                .leftJoinAndSelect("user.expertProfile", "expertProfile")
                .where("storeProfile.id IS NOT NULL AND expertProfile.id IS NOT NULL");
        }
        else if (stores){
            queryBuilder.leftJoinAndSelect("user.storeProfile", "storeProfile")
                .where("storeProfile.id IS NOT NULL");
        }
        else if (experts){
            queryBuilder.leftJoinAndSelect("user.expertProfile", "expertProfile")
                .where("expertProfile.id IS NOT NULL");
        }

        if (excludeUserId) {
            queryBuilder.andWhere("user.id != :excludeUserId", { excludeUserId });
        }

        if (pending) {
            queryBuilder.andWhere("user.isPending = :isPending", { isPending: true });
        }

        if (count) {
            const totalCount = await queryBuilder.getCount();
            return { count: totalCount }
        }
        // Apply filtering based on the flags
        return queryBuilder.getMany();
    }

    async one(req:Request, res: Response) {
        const {id} = req.params
        if (!validator.isUUID(id)){
            res.status(400)
            return {message: "Error: formato de id inválido"}
        }
        const user = await this.userRepository.findOne({
            where: { id: id },
            relations: [
                "storeProfile", 
                "expertProfile", 
                "userHasRole", 
                "userHasRole.role",
                "userHasRole.role.roleHasPermission",
                "userHasRole.role.roleHasPermission.permission",
            ]
        })
        if (!user) {
            res.status(404)
            return {message: "Error: Usuario no encontrado"}
        }
        return user
    }

    async oneByEmail(email: string, res: Response){
        if (!email){
            res.status(400)
            return {message: "Error: email inválido"}
        }
        const user = await this.userRepository.findOne({
            where: { email: email },
            relations: [
                "storeProfile", 
                "expertProfile", 
                "userHasRole", 
                "userHasRole.role",
                "userHasRole.role.roleHasPermission",
                "userHasRole.role.roleHasPermission.permission",
            ]
        })
        if (!user) {
            res.status(404)
            return {message: "Error: Usuario no encontrado"}
        }
        return user
    }

    async sendMail(email: string, subject: String, content: any){
        const transporter = nodeMailer.createTransport({
            service: "gmail",
            port: 456,
            secure: true,
            auth: {
                user: process.env.EF_MAIL,
                pass: process.env.EF_PASS
            }
        })

        const mailOptions = {
            from: `"EyesFood" <${process.env.EF_MAIL}>`,
            to: `${email}`,
            subject: subject,
            html: content
        }

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else { 
              console.log('Email sent: ' + info.response);
            }
        });
    }

    async create(req: Request, res: Response) {
        const { email, name, pass, profilePic, userRole } = req.body;
        const authHeader = req.headers.authorization;
        let submitterRoles = "";

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
            submitterRoles = decoded.roles; // Assuming the token contains a payload with 'id'
        }
        const oldUser = await this.userRepository.findOneBy({email: email})
        if (oldUser){
            console.log("usuario ya existe")
            res.status(401)
            return {message: "Error: El usuario ya existe"}
        }
        const salt = await bcrypt.genSalt()
        const hashedPass = await bcrypt.hash(pass, salt)

        if (submitterRoles.includes("Admin") || submitterRoles.includes("Tech")){
            const user = Object.assign(new User(), {
                email: email,
                name: name,
                hash: hashedPass,
                profilePic: profilePic,
                isPending: false,
                isActive: true
            })
            return this.userRepository.save(user)
        }

        if (userRole.includes("Expert") || userRole.includes("Store")){
            const user = Object.assign(new User(), {
                email: email,
                name: name,
                hash: hashedPass,
                profilePic: profilePic,
                isPending: true
            })
            return this.userRepository.save(user)
        }
        else if (userRole.includes("Tech")){
            const user = Object.assign(new User(), {
                email: email,
                name: name,
                hash: hashedPass,
                profilePic: profilePic,
                isActive: true
            })
            return this.userRepository.save(user)
        }
        const activationToken = uuidv4()
        const activationExpire = new Date
        activationExpire.setMinutes(activationExpire.getMinutes() + 15) 
           
        const user = Object.assign(new User(), {
            email: email,
            name: name,
            hash: hashedPass,
            profilePic: profilePic,
            activationToken: activationToken,
            activationExpire: activationExpire
        })

        const createdUser = await this.userRepository.save(user)
        console.log(process.env.EF_MAIL, process.env.EF_PASS)
        if (createdUser){
            return this.userRepository.findOne({
                where: { id: user.id },
                relations: [
                    "storeProfile", 
                    "expertProfile", 
                    "userHasRole", 
                    "userHasRole.role",
                    "userHasRole.role.roleHasPermission",
                    "userHasRole.role.roleHasPermission.permission",
                ]
            })
        }
        res.status(500)
        return {message: "Error: No se pudo crear el usuario"}
        
    }

    async getGoogleData(accessToken: string, res: Response){
        console.log(accessToken)
        try {
            const response = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            console.log("Error: ", error);
            res.status(404)
            return null; // Return null or handle the error appropriately
        }     
    }

    async createGoogleUser(data: any, res: Response){
        let now = new Date
        const user = Object.assign(new User(), {
            email: data.email,
            name: data.name,
            profilePic:data.picture,
            isActive: true,
            typeExternal: "Google",
            externalId: data.accessToken,
            lastLogin: now
        })
        let newUser = await this.userRepository.save(user)
        data.userRole.map(async (roleName) => {
            const role = await this.roleController.oneByName(roleName)
            let roleToUser = await this.userHasRoleController.create(newUser, role)
        })
        return newUser
    }

    async update(req: Request, res: Response) {
        const {id} = req.params
        if (!id){
            res.status(400)
            return {message: "Error: id inválida"}
        }
        if (req.body.pass){
            const user = await this.userRepository.findOneBy({id: id})
            const checkPass = await bcrypt.compare(req.body.oldPass, user.hash)
            if (checkPass){
                const salt = await bcrypt.genSalt()
                const hashedPass = await bcrypt.hash(req.body.pass, salt)
                req.body.hash = hashedPass
                delete req.body.pass
                delete req.body.oldPass
            }
            else {
                res.status(400)
                return {message: "Error: Contraseña inválida"}
            }
        }
        let {reason, ...newUser} = req.body
        const updatedUser = await this.userRepository.update(id, newUser)
        if (updatedUser.affected === 1){
            return this.userRepository.findOne({
                where: {id: id},
                relations: [
                    "storeProfile", 
                    "expertProfile", 
                    "userHasRole", 
                    "userHasRole.role",
                    "userHasRole.role.roleHasPermission",
                    "userHasRole.role.roleHasPermission.permission",
                ]
            })
        }
        res.status(500)
        return {message: "Error al actualizar usuario"}
        
    }

    async remove(request: Request, response: Response, next: NextFunction) {
        const id = request.params.id

        if(!id){
            response.status(400)
            return {message:"Error: id inválida"}
        }

        let userToRemove = await this.userRepository.findOneBy({ id: id })

        if (!userToRemove) {
            response.status(404)
            return {message: "Error: Usuario no existe"}
        }
        return this.userRepository.remove(userToRemove)
    }

    async activate(req: Request, res: Response){
        const { id, token } = req.params
        if (!validator.isUUID(id)) {
            res.status(400);
            throw new Error("Error: formato de id inválido");
        }
        let user = await this.userRepository.findOneBy({ id: id })
        if(!user){
            res.status(404)
            throw new Error("Error: Usuario no existe");
        }
        if (user.isSuspended){
            res.status(403)
            throw new Error("Error: usuario suspendido");
        }
        else if (user.isActive){
            res.status(400)
            throw new Error("Error: usuario ya está activo");
        }

        else if (user.activationToken == token){
            let now = new Date()
            if (user.activationExpire<now){
                res.status(400)
                throw new Error("Error: Enlace ya expiró");
            }
            else{
                const updatedUser = await this.userRepository.update(id, {isActive: true, isPending: false})
                if(updatedUser.affected===1){
                    return this.userRepository.findOne({where: {id}})
                }
                res.status(500)
                throw new Error("Error al actualizar usuario");
            }

        }
        else{
            res.status(403)
            throw new Error("Error: Token inválida");
        }
    }

    async resetActivate(req: Request, res: Response) {
        const { id } = req.params;
    
        if (!validator.isUUID(id)) {
            res.status(400);
            throw new Error("Error: formato de id inválido");
        }
    
        const user = await this.userRepository.findOneBy({ id });
        if (!user) {
            res.status(404);
            throw new Error("Error: Usuario no existe");
        }
    
        if (user.isActive || user.isSuspended) {
            res.status(400);
            throw new Error("Error: Usuario ya está activo");
        }
    
        const activationToken = uuidv4();
        const activationExpire = new Date();
        activationExpire.setMinutes(activationExpire.getMinutes() + 15);
    
        const updatedUser = await this.userRepository.update(id, {
            activationToken,
            activationExpire,
        });
    
        if (updatedUser.affected === 1) {
            return this.userRepository.findOne({ where: { id } });
        }
    
        res.status(500);
        throw new Error("Error al actualizar usuario");
    }

    async allowResetPassword(req: Request, res: Response){
        const {email} = req.body
    
        const user = await this.userRepository.findOneBy({ email });
        if (!user) {
            res.status(404);
            throw new Error("Error: Usuario no existe");
        }
        const activationToken = uuidv4()
        const activationExpire = new Date
        activationExpire.setMinutes(activationExpire.getMinutes() + 15) 

        const updatedUser = await this.userRepository.update(user.id, {
            activationToken,
            activationExpire,
        });
    
        if (updatedUser.affected === 1) {
            return this.userRepository.findOne({ where: { id: user.id } });
        }
        res.status(500);
        throw new Error("Error al actualizar usuario");

    }

    async resetPassword(req: Request, res: Response){
        const {newPass, activationToken} = req.body
        const {id} = req.params
        if (!validator.isUUID(id)) {
            res.status(400);
            throw new Error("Error: formato de id inválido");
        }
    
        const user = await this.userRepository.findOneBy({ id });
        if (!user) {
            res.status(404);
            throw new Error("Error: Usuario no existe");
        }
        if (activationToken !== user.activationToken){
            res.status(403);
            throw new Error("Error: Usuario no autorizado");
        }
        let now = new Date()
        if (user.activationExpire<now){
            res.status(400)
            throw new Error("Error: Enlace ya expiró");
        }
        const salt = await bcrypt.genSalt()
        const hashedPass = await bcrypt.hash(newPass, salt)
        const updatedUser = await this.userRepository.update(id, {hash: hashedPass})
        if(updatedUser.affected===1){
            return this.userRepository.findOne({where: {id}})
        }
        res.status(500)
        throw new Error("Error al actualizar usuario");
        
    }

    async authUser(req: Request, res: Response){
        const { email, pass } = req.body
        const role= req.query.r
        if (!role) {
            res.status(400)
            return { message: 'Parámetro inválido.' }
        }
        if (typeof role !== 'string') {
            res.status(400)
            return { message: 'Parámetro inválido.' }
        }
        const user = await this.userRepository.findOne({
            where: { email: email },
            relations: [
                "storeProfile", 
                "expertProfile", 
                "userHasRole", 
                "userHasRole.role",
                "userHasRole.role.roleHasPermission",
                "userHasRole.role.roleHasPermission.permission",
            ]
        })
        if (!user){
            res.status(404)
            return {message: "Error: email no encontrado"}
        }
        const userRoles = user.userHasRole?.map((userRole: any) => userRole.role?.name).filter(Boolean)
        if (!userRoles.includes(role)){
            res.status(403)
            return {message: "Error: Usuario no autorizado"}
        }
        
        if (user && user.hash){
            const checkPass = await bcrypt.compare(pass, user.hash)
            if (checkPass){
                if (user.isActive){
                    if (user.isSuspended){
                        res.status(403)
                        return {message: "Cuenta suspendida."}
                    }
                    const token = jwt.sign(
                        {
                            name: user.name, 
                            email: user.email, 
                            id: user.id, 
                            roles: user.userHasRole?.map((userRole: any) => userRole.role?.name).filter(Boolean).join(",")
                        }, process.env.JWT_SECRET
                    )
                    // res.cookie("token", token, {
                    //     httpOnly: false,
                    //     sameSite: "none",
                    //     partitioned: true,
                    //     secure: true
                    // })
                    user.lastLogin = new Date
                    this.userRepository.update(user.id, {lastLogin: user.lastLogin})
                    return {...user, token, lastLogin: user.lastLogin, roles: user.userHasRole?.map((userRole: any) => userRole.role?.name).filter(Boolean).join(",")}
                }
                res.status(403)
                return {message: "Cuenta inactiva."}
                
                
            }
            res.status(401)
            return {message: "Contraseña incorrecta."}
            
        }
        res.status(401)
        return {message:"Usuario no encontrado"}
        
    }
    async authUserGoogle(email:string, accesstoken:string, res: Response){
        if (!email){
            res.status(400)
            return {message: "Error: email inválido"}
        }
        const user = await this.userRepository.findOne({
            where: { email: email },
            relations: [
                "storeProfile", 
                "expertProfile", 
                "userHasRole", 
                "userHasRole.role",
                "userHasRole.role.roleHasPermission",
                "userHasRole.role.roleHasPermission.permission",
            ]
        })
        if (user){  
            if (user.isActive){
                const token = jwt.sign(
                    {
                        name: user.name, 
                        email: user.email, 
                        id: user.id, 
                        roles: user.userHasRole?.map((userRole: any) => userRole.role?.name).filter(Boolean).join(", ")
                    }, process.env.JWT_SECRET
                )
                // res.cookie("token", token, {
                //     httpOnly: false,
                //     sameSite: "none",
                //     partitioned: true,
                //     secure: true
                // })
                user.lastLogin = new Date
                this.userRepository.update(user.id, {lastLogin: user.lastLogin})
                return {...user, token, lastLogin: user.lastLogin}
            }    
        }
        res.status(404)
        return {message: "Error: Usuario no encontrado"}
    }

    async getRoles(req: Request, res: Response){
        const {id} = req.params
        if (!id){
            res.status(400)
            return {message: "Error: id inválida"}
        }
        const user = await this.userRepository.findOne({
            where: { id: id },
            relations: [
                "userHasRole", 
                "userHasRole.role",
                "userHasRole.role.roleHasPermission",
                "userHasRole.role.roleHasPermission.permission",
            ]
        })
        if (!user) {
            res.status(404)
            return {message: "Error: Usuario no encontrado"}
        }
        const roles = user.userHasRole.map(userRole => userRole.role.name);
        return roles
    }

}