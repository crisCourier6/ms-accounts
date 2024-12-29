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
const validator = require("validator")

export class MainController{

    private userController = new UserController
    private roleController = new RoleController
    private userHasRoleController = new UserHasRoleController
    private storeProfileController = new StoreProfileController
    private permissionController = new PermissionController
    private roleHasPermissionController = new RoleHasPermissionController
    private expertProfileController = new ExpertProfileController

    async validateToken(req:Request, res:Response, next: NextFunction, channel: Channel) {
        res.status(200)
        return {message: "valid"}
    }
    // users

    // usersAll() retorna todos los usuarios registrados
    async usersAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const count = req.query.count === "true";
        if (count){
            return this.userController.all(req, res)
        }
        let users = await this.userController.all(req, res) as User[]
        users = users.filter(user => user !== null)
        //cuando se quiera llenar tablas en otros microservicios
        // users.forEach(user => {
        //     const trimmedUser = {...user,}
        //     channel.publish("Accounts", "user.create", Buffer.from(JSON.stringify(trimmedUser)))
        // })
        return users
    }
    // usersOne() retorna el usuario con la id indicada en los parámetros de la uri
    async usersOne(req: Request, res: Response, next: NextFunction, channel: Channel) {
        let {id} = req.params
        if (!id){
            res.status(400)
            return {message: "Error: falta parámetro id"}
        }
        if (!validator.isUUID(id)){
            res.status(400)
            return {message: "Error: formato de id inválido"}
        }
        return this.userController.one(req, res) 
    }
    // usersOneByEmail() retorna el usuario con el email indicado en los parámetros de la uri
    async usersOneByEmail(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.userController.oneByEmail(req.body.email, res)
    }
    // usersCreate() crea un usuario nuevo con los datos provenientes en la request y lo retorna
    async usersCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const newUser = await this.userController.create(req ,res) as User
        if (res.statusCode === 401 || res.statusCode === 500){
            return newUser
        }
        const {userRole} = req.body
        let roleToUser = undefined
        let expertProfile = undefined
        let storeProfile = undefined
        if (userRole.includes("Expert")){
            expertProfile = await this.expertProfileController.create(req.body, res, newUser)
        }
       
        else if (userRole.includes("Store")){
            storeProfile = await this.storeProfileController.create(req.body, res, newUser)
        }
        userRole.map(async (roleName) => {
            const role = await this.roleController.oneByName(roleName)
            roleToUser = await this.userHasRoleController.create(newUser, role)
        })
        req.params.id = newUser.id
        await this.userController.one(req, res)
        .then(result => {
            if(res.statusCode<400){
                const trimmedUser = {...result}
                console.log(trimmedUser)
                channel.publish("Accounts", "user.create", Buffer.from(JSON.stringify(trimmedUser)))
            }
            res.send(result)
        })
        .catch(error =>{
            res.send(error)
        })
    }
    // usersUpdate() modifica los datos de una cuenta y retorna el resultado
    async usersUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        await this.userController.update(req, res)
        .then(result => {
            if(result){
                const trimmedUser = {...result}
                console.log(trimmedUser)
                channel.publish("Accounts", "user.update", Buffer.from(JSON.stringify(trimmedUser)))
                if(req.body.reason){
                    let message = `Tu cuenta fue desactivada por la siguiente razón: ${req.body.reason}`
                    const info = {id:req.params.id, message}
                    channel.publish("Accounts", "user.notify", Buffer.from(JSON.stringify(info)))
                }
            }
            console.log(result)
            res.send(result)
        })
        .catch(error =>{
            res.send(error)
        })
    }
    async usersAllowResetPass(req: Request, res: Response, next: NextFunction, channel: Channel) {
        await this.userController.allowResetPassword(req, res)
        .then(result => {
            if(result){
                console.log(result)
                const trimmedUser = {...result, lostPass: true}
                channel.publish("Accounts", "user.update", Buffer.from(JSON.stringify(trimmedUser)))
            }
            res.send(result)
        })
        .catch(error =>{
            res.send({ message: error.message });
        })
    }
    async usersResetPassword(req: Request, res: Response, next: NextFunction, channel: Channel) {
        await this.userController.resetPassword(req, res)
        .then(result => {
            if(result){
                console.log(result)
                const trimmedUser = {...result}
                channel.publish("Accounts", "user.update", Buffer.from(JSON.stringify(trimmedUser)))
            }
            res.send(result)
        })
        .catch(error =>{
            res.send({ message: error.message });
        })
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
                redirect_uri: process.env.EF_MAIN_REMOTE,
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
        await this.userController.activate(req, res)
        .then((result) => {
            if (result) {
                console.log(result);
                const trimmedUser = { ...result };
                channel.publish(
                    "Accounts",
                    "user.update",
                    Buffer.from(JSON.stringify(trimmedUser))
                );
            }
            res.send(result); // Success response
        })
        .catch((error) => {
            console.error(error.message); // Log the error
            res.send({ message: error.message }); // Send error message in response
        });
    }
    async usersResetActivate(req: Request, res: Response, next: NextFunction, channel: Channel){
        await this.userController.resetActivate(req, res)
        .then((result) => {
            if (result) {
                console.log(result);
                const trimmedUser = { ...result };
                channel.publish(
                    "Accounts",
                    "user.resetActivate",
                    Buffer.from(JSON.stringify(trimmedUser))
                );
            }
            res.send(result); // Success response
        })
        .catch((error) => {
            console.error(error.message); // Log the error
            res.send({ message: error.message }); // Send error message in response
        });
    }
    // usersRemove() elimina al usuario con la id indicada en los parámetros de la URI y lo retorna. También publica la id
    // en su canal de RabbitMQ para informar a los otros microservicios del suceso
    async usersRemove(req: Request, res: Response, next: NextFunction, channel: Channel){
        await this.userController.remove(req, res, next)
        .then(result => {
            if(result){
                console.log(result)
                channel.publish("Accounts", "user.remove", Buffer.from(JSON.stringify(req.params.id)))
            }
            res.send(result)
        })
        .catch(error =>{
            res.send(error)
        })
    }

    // roles

    // rolesAll() retorna todos los roles registrados
    async rolesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.all(req, res)
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
        return this.roleController.update(req, res)
    }
    // rolesRemoveById() elimina el rol con la id indicada en los parámetros de la URI
    async rolesRemoveById(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.remove(req, res)
    }

    // userHasRole

    // userHasRolesAll() retorna todas las relaciones de usuarios con roles
    async userHasRolesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userHasRoleController.all()
    }
    // userRoles() retorna los roles de un usuario según la id indicada en los parámetros de la uri
    async userRoles(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.getRoles(req, res)
    }

    async userRolesUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userHasRoleController.updateUserRoles(req, res)
    }
    // userActiveRoles() retorna los roles activos de un usuario según la id indicada en los parámetros de la uri
    async userActiveRoles(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userHasRolesRows =  await this.userHasRoleController.activeByUser(req.params.userId)
        return this.roleController.getAllbyIds(userHasRolesRows)
    }
    // assignRoleByName() asigna a un usuario el rol indicado en la request
    async assignRoleByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        
        const userId = req.params.id
        const roleId = await this.roleController.getIdByName(req.body.roleName)
        return this.userHasRoleController.create(userId, roleId)
    }
    // cancelRoleByName() elimina de un usuario el rol indicado en la request
    async cancelRoleByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userId = req.params.id
        const roleId = await this.roleController.getIdByName(req.body.roleName)
        return this.userHasRoleController.cancelRole(userId, roleId)
    }

    // store profile

    //storesAll retorna todas las tiendas registradas
    async storesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.all()
    }

    async storesOne(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.storeProfileController.one(req.params.id, res)
    }

    async storesOneByUserId(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.storeProfileController.oneByUserId(req.params.id, res)
    }
    // storesCreate() crea un nuevo perfil de tienda con los datos provenientes en la request y lo retorna
    async storesCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.create(req.body, res)   
    }
    // storesUpdate() actualiza los datos del perfil de tienda y lo retorna
    async storesUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        await this.storeProfileController.update(req, res)
        .then(result => {
            if(res.statusCode<400){
                console.log(result)
                channel.publish("Accounts", "store.update", Buffer.from(JSON.stringify(result)))
            }
            res.send(result)
        })
        .catch(error =>{
            res.send(error)
        })  
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

    async expertsOneByUserId(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.expertProfileController.oneByUserId(req.params.id, res)
    }
    // expertsCreate() crea un nuevo perfil de experto con los datos provenientes en la request y lo retorna
    async expertsCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.expertProfileController.create(req.body, res)   
    }
    // expertsUpdate() actualiza los datos del perfil de experto y lo retorna
    async expertsUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        await this.expertProfileController.update(req, res)
        .then(result => {
            if(res.statusCode<400){
                console.log(result)
                channel.publish("Accounts", "expert.update", Buffer.from(JSON.stringify(result)))
            }
            res.send(result)
        })
        .catch(error =>{
            res.send(error)
        })   
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
        return this.permissionController.update(req, res)
    }
    // permissionsRemoveById() elimina el permiso de experto con la id indicada en los parámetros de la URI
    async permissionsRemoveById(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.remove(req, res)
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
    async updateRolePermissions(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleHasPermissionController.updateRolePermissions(req, res)
    }
    // cancelPermissionByName() elimina el permiso indicado en la request del rol con la id indicada en los parámetros de la URI
    async cancelPermissionByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const roleId = req.params.roleId
        const permissionId = await this.permissionController.getIdByName(req.body.permissionName)
        return this.roleHasPermissionController.cancelPermission(roleId, permissionId)
    }
}