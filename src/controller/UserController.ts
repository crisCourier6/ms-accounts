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
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require("jsonwebtoken")

export class UserController {

    private userRepository = AppDataSource.getRepository(User)
    private roleController = new RoleController
    private userHasRoleController = new UserHasRoleController

    async all() {
        return this.userRepository.find()
    }

    async one(id: string, res: Response) {
  
        const user = await this.userRepository.findOne({
            where: { id: id }
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
        const user = await this.userRepository.findOneBy({ email: email })
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
        const oldUser = await this.userRepository.findOneBy({email: email})
        if (oldUser){
            console.log("usuario ya existe")
            res.status(401)
            return {message: "Error: El usuario ya existe"}
        }
        const salt = await bcrypt.genSalt()
        const hashedPass = await bcrypt.hash(pass, salt)
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
        activationExpire.setMinutes(activationExpire.getMinutes() + 30) 
           
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
            const activationMail = `
                <h4>
                    Siga el siguiente enlace para activar su cuenta de EyesFood
                    (fecha de vencimiento: ${createdUser.activationExpire.toLocaleDateString("es-CL", { year: 'numeric', 
                                                                                                        month: 'long', 
                                                                                                        day: 'numeric',
                                                                                                        hour: "numeric",minute: "numeric" })}):
                </h4> 
                <a href="http://192.168.100.6:4000/activate/${createdUser.id}/${createdUser.activationToken}">Activar cuenta</a>
            `
            await this.sendMail(createdUser.email, "Activar cuenta EyesFood", activationMail)

            return createdUser
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

    async update(req: Request) {
        if (req.body.pass){
            const user = await this.userRepository.findOneBy({id: req.params.id})
            const checkPass = await bcrypt.compare(req.body.oldPass, user.hash)
            if (checkPass){
                const salt = await bcrypt.genSalt()
                const hashedPass = await bcrypt.hash(req.body.pass, salt)
                req.body.hash = hashedPass
                delete req.body.pass
                delete req.body.oldPass
            }
            else {
                return {error: "oldPass"}
            }
        }
        let newUser = {...req.body, ["user"]: undefined}
        const updatedUser = await this.userRepository.update(req.params.id, newUser)
        if (updatedUser){
            return updatedUser
        }
        return []
        
    }

    async remove(request: Request, response: Response, next: NextFunction) {
        const id = request.params.id as string

        let userToRemove = await this.userRepository.findOneBy({ id: id })

        if (!userToRemove) {
            return undefined
        }

        return this.userRepository.remove(userToRemove)
    }

    async activate(req: Request, res: Response){
        const { id, token } = req.params
        let user = await this.userRepository.findOneBy({ id: id })
        if (user.isSuspended){
            console.log("usuario suspendido")
            res.status(403)
            return false
        }
        else if (user.isActive){
            console.log("usuario ya está activo")
            return true
        }

        else if (user.activationToken == token){
            let now = new Date()
            if (user.activationExpire<now){
                console.log("enlace expiró")
                return false
            }
            else{
                await this.userRepository.update(id, {isActive: true, isPending: false})
                console.log("usuario activado")
                return true
            }
        }
        else{
            console.log("token inválida")
            return false
        }
    }

    async authUser(req: Request, res: Response){
        const { email, pass } = req.body
        const { v } = req.query
        if (v !== undefined && typeof v !== 'string') {
            res.status(400)
            return { message: 'Parámetro inválido.' }
        }
        const user = await this.userRepository.findOneBy({email: email})
        if (user.hash){
            const checkPass = await bcrypt.compare(pass, user.hash)
            if (checkPass){
                if (user.isActive){
                    const userHasRolesRows =  await this.userHasRoleController.activeByUser(user.id)
                    const userRoles = await this.roleController.getAllbyIds(userHasRolesRows)
                    if (v && !userRoles.roles.includes("Admin") && !userRoles.roles.includes("Tech")){
                        res.status(401)
                        return {message: "Usuario sin permiso para entrar."}    
                    }
                    
                    const token = jwt.sign({name: user.name, email: user.email, id: user.id, roles: userRoles.roles}, process.env.JWT_SECRET)
                    // res.cookie("token", token, {
                    //     httpOnly: false,
                    //     sameSite: "none",
                    //     partitioned: true,
                    //     secure: true
                    // })
                    user.lastLogin = new Date
                    const userFull = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        roles: userRoles.roles,
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin,
                        token: token
                    } 
                    this.userRepository.save(user)
                    return userFull
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
        const user = await this.userRepository.findOneBy({email: email})
        if (user){  
            if (user.isActive){
                const userHasRolesRows =  await this.userHasRoleController.activeByUser(user.id)
                const userRoles = await this.roleController.getAllbyIds(userHasRolesRows)
                const token = jwt.sign({name: user.name, email: user.email, id: user.id, roles: userRoles.roles}, process.env.JWT_SECRET)
                // res.cookie("token", token, {
                //     httpOnly: false,
                //     sameSite: "none",
                //     partitioned: true,
                //     secure: true
                // })
                user.lastLogin = new Date
                user.externalId = accesstoken
                const userFull = {
                    ...userRoles,
                    ...user,
                    token: token
                } 
                this.userRepository.save(user)
                return userFull
            }    
        }
        res.status(404)
        return {message: "Error: Usuario no encontrado"}
    }

}