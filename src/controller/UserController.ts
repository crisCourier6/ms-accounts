import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { User } from "../entity/User"
import { UserHasRoleController } from "./UserHasRoleController";
import { RoleController } from "./RoleController";
import { v4 as uuidv4, v6 as uuidv6 } from 'uuid';
import "dotenv/config"

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

    async one(id: string) {
  
        const user = await this.userRepository.findOne({
            where: { id: id }
        })
        console.log(user)
        if (!user) {
            console.log("no hay")
            return []
        }
        const userFull = {
            ...user,
            createdAt: user.createdAt.toLocaleDateString("es-CL", ),
            lastLogin: user.lastLogin.toLocaleDateString("es-CL", ),
        }
        return userFull
    }

    async oneByEmail(email: string){
        const user = await this.userRepository.find({
            where: { email: email }
        })
        console.log(user)
        if (user === undefined || user.length==0){
            return undefined
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
        const { email, name, pass, profilePic } = req.body;
        const oldUser = await this.userRepository.findOneBy({email: email})
        if (oldUser){
            console.log("usuario ya existe")
            res.status(401)
            return undefined
        }
        const salt = await bcrypt.genSalt()
        const hashedPass = await bcrypt.hash(pass, salt)
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
        return undefined
        
    }

    async createGoogle(req: Request){
        let {name, email, profilePic, isActive, typeExternal, externalId } = req.body
        let now = new Date
        const user = Object.assign(new User(), {
            email: email,
            name: name,
            profilePic: profilePic,
            isActive: isActive,
            typeExternal: typeExternal,
            externalId: externalId,
            lastLogin: now
        })
        return this.userRepository.save(user)
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
        const updatedUser = await this.userRepository.update(req.params.id, req.body)
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
                await this.userRepository.update(id, {isActive: true})
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
        const user = await this.userRepository.findOneBy({email: email})
        if (user.hash){
            const checkPass = await bcrypt.compare(pass, user.hash)
            if (checkPass){
                if (user.isActive){
                    const userHasRolesRows =  await this.userHasRoleController.activeByUser(user.id)
                    const userRoles = await this.roleController.getAllbyIds(userHasRolesRows)
                    const token = jwt.sign({name: user.name, email: user.email}, process.env.JWT_SECRET)
                    // res.cookie("token", token, {
                    //     httpOnly: false,
                    //     sameSite: "none",
                    //     partitioned: true,
                    //     secure: true
                    // })
                    user.lastLogin = new Date
                    const userFull = {
                        ...userRoles,
                        ...user,
                        createdAt: user.createdAt.toLocaleDateString("es-CL", { year: 'numeric', month: 'long', day: 'numeric' }),
                        lastLogin: user.lastLogin.toLocaleDateString("es-CL", { year: 'numeric', month: 'long', day: 'numeric' }),
                        token: token
                    } 
                    this.userRepository.save(user)
                    return userFull
                }
                res.status(403)
                return []
                
            }
            res.status(401)
            return []
        }
        res.status(401)
        return []
    }
    async authUserGoogle(req: Request, res: Response){
        const user = await this.userRepository.findOneBy({email: req.body.email})
        if (user){  
            if (user.isActive){
                const userHasRolesRows =  await this.userHasRoleController.activeByUser(user.id)
                const userRoles = await this.roleController.getAllbyIds(userHasRolesRows)
                const token = jwt.sign({name: user.name, email: user.email}, process.env.JWT_SECRET)
                // res.cookie("token", token, {
                //     httpOnly: false,
                //     sameSite: "none",
                //     partitioned: true,
                //     secure: true
                // })
                user.lastLogin = new Date
                const userFull = {
                    ...userRoles,
                    ...user,
                    token: token
                } 
                this.userRepository.save(user)
                return userFull
            }    
        }
        res.status(401)
        return []
    }

}