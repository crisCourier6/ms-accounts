import { NextFunction, Request, Response } from "express"
import { UserController } from "./UserController"
import { RoleController } from "./RoleController"
import { UserHasRoleController } from "./UserHasRoleController"
import { StoreProfileController } from "./StoreProfileController"
import { PermissionController } from "./PermissionController"
import { RoleHasPermissionController } from "./RoleHasPermissionController"
import { ExpertProfileController } from "./ExpertProfileController"
import { Channel } from "amqplib"
import { User } from "../entity/User"
import axios from "axios"
import "dotenv/config"
const jwt = require("jsonwebtoken")

export class MainController{

    private userController = new UserController
    private roleController = new RoleController
    private userHasRoleController = new UserHasRoleController
    private storeProfileController = new StoreProfileController
    private permissionController = new PermissionController
    private roleHasPermissionController = new RoleHasPermissionController
    private expertProfileController = new ExpertProfileController
    // users

    // usersAll() retorna todos los usuarios registrados
    async usersAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        
        let decoded = req.body.user
        if (!decoded){
            res.status(400)
            return {message: "Error: Usuario no autenticado"}
        }
        let users = await this.userController.all() as User[]
        users = await Promise.all(users.map(async (user) => {
            let expertProfile = undefined
            let storeProfile = undefined
            console.log(user)
            let userRolesPairs = await this.userHasRoleController.byUser(user.id)
            let userRoles = await this.roleController.getAllbyIds(userRolesPairs) as { roles: string[] }
            if (userRoles.roles.includes("Admin") && !decoded.roles.includes("Admin")) {
                return null
            }
            if (userRoles.roles.includes("Expert")){
                await this.expertProfileController.oneByUserId(user.id, res)
                .then(profile => {
                    expertProfile = profile
                })
                .catch(error => {
                    console.log(error)
                })
            }
            if (userRoles.roles.includes("Store")){
                await this.storeProfileController.oneByUserId(user.id, res)
                .then(profile => {
                    storeProfile = profile
                })
                .catch(error => {
                    console.log(error)
                })
            }
            return {
                ...expertProfile,
                ...storeProfile,
                ...user,
                roles: userRoles.roles.join(", ")
            }
        }))
        users = users.filter(user => user !== null)
        console.log(users)
        return users
    }
    // usersOne() retorna el usuario con la id indicada en los parámetros de la uri
    async usersOne(req: Request, res: Response, next: NextFunction, channel: Channel) {
        let user = await this.userController.one(req.params.id, res) as Object
        if(res.statusCode === 404){
            return user
        }
        let userRolesPairs = await this.userHasRoleController.byUser(req.params.id)
        let userRoles = await this.roleController.getAllbyIds(userRolesPairs) as { roles: string[] }
        let userFull = {
            ...user,
            roles: userRoles.roles.join(", ")
        }
        return userFull
    }
    // usersOneByEmail() retorna el usuario con el email indicado en los parámetros de la uri
    async usersOneByEmail(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.userController.oneByEmail(req.body.email, res)
    }
    // usersCreate() crea un usuario nuevo con los datos provenientes en la request y lo retorna
    async usersCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const newUser = await this.userController.create(req ,res)
        if (res.statusCode === 401 || res.statusCode === 500){
            return newUser
        }
        console.log("usuario creado")
        const {userRole} = req.body
        let roleToUser = undefined
        let expertProfile = undefined
        let storeProfile = undefined
        if (userRole.includes("Expert")){
            console.log("voy a agregar experto a usuario")
            expertProfile = await this.expertProfileController.create(req.body, res, newUser)
        }
       
        else if (userRole.includes("Store")){
            console.log("voy a agregar tienda a usuario")
            storeProfile = await this.storeProfileController.create(req.body, newUser)
        }
        userRole.map(async (roleName) => {
            const role = await this.roleController.oneByName(roleName)
            roleToUser = await this.userHasRoleController.create(newUser, role)
        })

        return {...expertProfile, ...storeProfile, ...newUser, roles:userRole}
    }
    // usersUpdate() modifica los datos de una cuenta y retorna el resultado
    async usersUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.update(req)
    }
    // usersAuthLogin() verifica las credenciales de un usuario y retorna el resultado
    // que puede ser el usuario y su jason web token, o un mensaje de error de verificación
    async usersAuthLogIn(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.authUser(req, res)
    }
    // getGoogleTokens recibe el código de autorización obtenido al intentar iniciar sesión con Google y 
    // retorna tokens de acceso y de refresco
    async getGoogleTokens(req:Request,res:Response,next:NextFunction,channel:Channel){
        const { code } = req.body
        try {
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                code: code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.EF_MAIN_LOCAL,
                grant_type: 'authorization_code',
            })
            const { access_token, refresh_token, expires_in } = response.data
            const newTokens = {
                access_token,
                refresh_token,
                expires_in,
                issued_at: Date.now()
            }
            return newTokens
        } 
        catch (error) {
            console.error("Error al obtener tokens", error)
            res.status(500)
            return {message :"Error al intercambiar código de autorización por tokens"}
        }
    }
    // usersAuthLogInGoogle() recibe la token de acceso otorgada por Google, obtiene los datos de la cuenta de google del usuario
    // y retorna los datos de la cuenta de EyesFood del usuario
    async usersAuthLogInGoogle(req: Request, res: Response, next: NextFunction, channel: Channel) {
        let { accessToken, userRole } = req.body
        
        let googleData = await this.userController.getGoogleData(accessToken, res)
        if (!googleData){
            return {message:"Error al obtener perfil de Google"}
        }
        let user = await this.userController.oneByEmail(googleData.email, res)
        if (res.statusCode === 400){
            return user
        }
        else if (res.statusCode !== 404){
            return this.userController.authUserGoogle(googleData.email, accessToken, res)
        }
        res.status(200)
        let newUser = await this.userController.createGoogleUser({...googleData, accessToken, userRole}, res)
        if (newUser){
            return this.userController.authUserGoogle(newUser.email, accessToken, res)
        }
        res.status(500)
        return {message: "Error al acceder con cuenta google"}
    }
    // usersActivate() cambia el estado de un usuario desactivado a activado
    async usersActivate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.activate(req, res)
    }
    // usersRemove() elimina al usuario con la id indicada en los parámetros de la URI y lo retorna. También publica la id
    // en su canal de RabbitMQ para informar a los otros microservicios del suceso
    async usersRemove(req: Request, res: Response, next: NextFunction, channel: Channel){
        await this.userController.remove(req, res, next)
        .then(result => {
            if(result){
                channel.publish("Accounts", "user.remove", Buffer.from(JSON.stringify(req.params.id)))
            }
            res.send(result)
        })
    }

    // roles

    // rolesAll() retorna todos los roles registrados
    async rolesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.all()
    }
    // rolesOne() retorna el rol con la id indicada en los parámetros de la uri
    async rolesOne(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.one(req.params.id)
    }
    // rolesCreate() crea un nuevo rol con los datos provenientes en la request y lo retorna
    async rolesCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.create(req.body)
    }
    // rolesUpdate() actualiza los datos del rol y lo retorna
    async rolesUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.update(req)
    }
    // rolesRemoveById() elimina el rol con la id indicada en los parámetros de la URI
    async rolesRemoveById(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.remove(req.params.roleId)
    }

    // userHasRole

    // userHasRolesAll() retorna todas las relaciones de usuarios con roles
    async userHasRolesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.all()
    }
    // userRoles() retorna los roles de un usuario según la id indicada en los parámetros de la uri
    async userRoles(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userHasRolesRows =  await this.userHasRoleController.byUser(req.params.userId)
        console.log(userHasRolesRows)
        return this.roleController.getAllbyIds(userHasRolesRows)
    }
    // userActiveRoles() retorna los roles activos de un usuario según la id indicada en los parámetros de la uri
    async userActiveRoles(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userHasRolesRows =  await this.userHasRoleController.activeByUser(req.params.userId)
        return this.roleController.getAllbyIds(userHasRolesRows)
    }
    // assignRoleByName() asigna a un usuario el rol indicado en la request
    async assignRoleByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        
        const userId = req.params.userId
        const roleId = await this.roleController.getIdByName(req.body.roleName)
        return this.userHasRoleController.create(userId, roleId)
    }
    // cancelRoleByName() elimina de un usuario el rol indicado en la request
    async cancelRoleByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userId = req.params.userId
        const roleId = await this.roleController.getIdByName(req.body.roleName)
        return this.userHasRoleController.cancelRole(userId, roleId)
    }

    // store profile

    //storesAll retorna todas las tiendas registradas
    async storesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.all()
    }
    // storesCreate() crea un nuevo perfil de tienda con los datos provenientes en la request y lo retorna
    async storesCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.create(req.body)   
    }
    // storesUpdate() actualiza los datos del perfil de tienda y lo retorna
    async storesUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.update(req)   
    }
    // storesRemove() elimina el perfil de tienda con la id indicada en los parámetros de la URI
    async storesRemove(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.storeProfileController.remove(req, res, next)
    }

    // expert profile

    //expertsAll retorna todos los perfiles de expertos
    async expertsAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.expertProfileController.all()
    }
    // expertsCreate() crea un nuevo perfil de experto con los datos provenientes en la request y lo retorna
    async expertsCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.expertProfileController.create(req.body, res)   
    }
    // expertsUpdate() actualiza los datos del perfil de experto y lo retorna
    async expertsUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.expertProfileController.update(req, res)   
    }
    // expertRemove() elimina el perfil de experto con la id indicada en los parámetros de la URI
    async expertsRemove(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.expertProfileController.remove(req, res)
    }

    // permissions

    //permissionsAll retorna todos los permisos
    async permissionsAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.all()
    }
    // permissionsOne() retorna el permiso con la id indicada en los parámetros de la URI
    async permissionsOne(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.one(req.params.id)
    }
    // permissionsCreate() crea un nuevo permiso con los datos provenientes en la request y lo retorna
    async permissionsCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.create(req.body)
    }
    // permissionsUpdate() actualiza los datos del permiso y lo retorna
    async permissionsUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.update(req)
    }
    // permissionsRemoveById() elimina el permiso de experto con la id indicada en los parámetros de la URI
    async permissionsRemoveById(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.remove(req.params.roleId)
    }

    // Role has permissions

    // roleHasPermissionsAll() retorna todas las filas de roleHasPermission
    async roleHasPermissionsAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleHasPermissionController.all()
    }
    // rolePermissions retorna todos los permisos del rol con la id indicada en los parámetros de la URI
    async rolePermissions(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const roleHasPermissionRows =  await this.roleHasPermissionController.byRole(req.params.roleId)
        console.log(roleHasPermissionRows)
        return this.permissionController.getAllbyIds(roleHasPermissionRows)
    }
    // assignPermissionByName() asigna el permiso indicado en la request al rol con la id indicada en los parámetros de la URI
    async assignPermissionByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        
        const roleId = req.params.roleId
        const permissionId = await this.permissionController.getIdByName(req.body.permissionName)
        console.log(roleId, permissionId)
        return this.roleHasPermissionController.create(roleId, permissionId)
    }
    // cancelPermissionByName() elimina el permiso indicado en la request del rol con la id indicada en los parámetros de la URI
    async cancelPermissionByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const roleId = req.params.roleId
        const permissionId = await this.permissionController.getIdByName(req.body.permissionName)
        return this.roleHasPermissionController.cancelPermission(roleId, permissionId)
    }
}