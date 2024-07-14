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


type userAuth = {
    id: string
    name: string
    email: string
    roles: string[]
    token: string
}

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

        if (!user) {
            return "unregistered user"
        }
        return user
    }

    async oneByEmail(email: string){
        const user = await this.userRepository.findOne({
            where: { email: email }
        })

        if (!user){
            return false
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

    async create(req: Request) {
        const { email, name, pass, profilePic } = req.body;
        const oldUser = await this.userRepository.findOneBy({email: email})
        if (oldUser){
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
                <h2>Siga el siguiente enlace para activar su cuenta de EyesFood (fecha de vencimiento: ${createdUser.activationExpire}):</h2> 
                <a href="http://192.168.100.6:4000/activate/${createdUser.id}/${createdUser.activationToken}">Activar cuenta</a>
            `
            await this.sendMail(createdUser.email, "Activar cuenta EyesFood", activationMail)

            return createdUser
        }
        return undefined
        
    }

    async update(request: any) {
        const updatedUser = await this.userRepository.update(request.params.id, request.body)
        if (updatedUser){
            return updatedUser
        }
        return "Error: couldn't update user"
        
    }

    async remove(request: Request, response: Response, next: NextFunction) {
        const id = request.params.id as string

        let userToRemove = await this.userRepository.findOneBy({ id: id })

        if (!userToRemove) {
            return "this user not exist"
        }

        await this.userRepository.remove(userToRemove)

        return "user has been removed"
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
        if (user){
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
                    const userFull : userAuth = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        roles: userRoles,
                        token: token
                    } 
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

}