import { NextFunction, Request, Response } from "express"
import { UserController } from "./UserController"
import { RoleController } from "./RoleController"
import { UserHasRoleController } from "./UserHasRoleController"
import { StoreProfileController } from "./StoreProfileController"
import { PermissionController } from "./PermissionController"
import { RoleHasPermissionController } from "./RoleHasPermissionController"
import { ExpertProfileController } from "./ExpertProfileController"
import { Channel } from "amqplib"

export class MainController{

    private userController = new UserController
    private roleController = new RoleController
    private userHasRoleController = new UserHasRoleController
    private storeProfileController = new StoreProfileController
    private permissionController = new PermissionController
    private roleHasPermissionController = new RoleHasPermissionController
    private expertProfileController = new ExpertProfileController
    // users
    async usersAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.all()
    }
    async usersOne(req: Request, res: Response, next: NextFunction, channel: Channel) {
        let user = await this.userController.one(req.params.id) as Object
        if(!user){
            return []
        }
        let userRolesPairs = await this.userHasRoleController.byUser(req.params.id)
        let userRoles = await this.roleController.getAllbyIds(userRolesPairs) as Object
        let userFull = {
            ...user,
            ...userRoles
        }
        return userFull
    }
    async usersOneByEmail(req: Request, res: Response, next: NextFunction, channel: Channel){
        return this.userController.oneByEmail(req.body.email)
    }
    async usersCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const newUser = await this.userController.create(req ,res)
        if (!newUser){
            return []
        }
        
        const {userRole} = req.body
        let roleToUser = undefined
        if (userRole=="Expert"){
            console.log("voy a agregar experto a usuario")
            await this.expertProfileController.create(req.body, newUser)
            const role = await this.roleController.oneByName("Expert")
            roleToUser = await this.userHasRoleController.create(newUser, role)
        }
       
        else if (userRole=="Store"){
            console.log("voy a agregar tienda a usuario")
            await this.storeProfileController.create(req.body, newUser)
            const role = await this.roleController.oneByName("Store")
            roleToUser = await this.userHasRoleController.create(newUser, role)
        }
        else {
            const role = await this.roleController.oneByName(userRole)
            roleToUser = await this.userHasRoleController.create(newUser, role)
        }

        return newUser
    }
    async usersUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.update(req)
    }
    async usersAuthLogIn(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.authUser(req, res)
    }
    async usersAuthLogInGoogle(req: Request, res: Response, next: NextFunction, channel: Channel) {
        let user = await this.userController.oneByEmail(req.body.email) as Object
        if(!user){
            console.log("no existe")
            user = await this.userController.createGoogle(req)
            console.log(user)
            let role = await this.roleController.oneByName(req.body.role)
            console.log(role)
            let roleToUser = await this.userHasRoleController.create(user, role)
        }
        
        return this.userController.authUserGoogle(req, res)
    }
    async usersActivate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.userController.activate(req, res)
    }
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
    async rolesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.all()
    }
    async rolesOne(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.one(req.params.id)
    }
    async rolesCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.create(req.body)
    }
    async rolesUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.update(req)
    }
    async rolesRemoveById(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.remove(req.params.roleId)
    }

    // userHasRole
    async userHasRolesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleController.all()
    }
    async userRoles(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userHasRolesRows =  await this.userHasRoleController.byUser(req.params.userId)
        console.log(userHasRolesRows)
        return this.roleController.getAllbyIds(userHasRolesRows)
    }

    async userActiveRoles(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userHasRolesRows =  await this.userHasRoleController.activeByUser(req.params.userId)
        return this.roleController.getAllbyIds(userHasRolesRows)
    }

    async assignRoleByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        
        const userId = req.params.userId
        const roleId = await this.roleController.getIdByName(req.body.roleName)
        return this.userHasRoleController.create(userId, roleId)
    }
    async cancelRoleByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const userId = req.params.userId
        const roleId = await this.roleController.getIdByName(req.body.roleName)
        return this.userHasRoleController.cancelRole(userId, roleId)
    }
    // store profiles
    async storesAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.all()
    }
    async storesCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.create(req.body)   
    }
    async storesUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.storeProfileController.update(req)   
    }
    async storesRemove(req: Request, res: Response, next: NextFunction, channel: Channel){
        console.log("going to remove a store")
        return this.storeProfileController.remove(req, res, next)
    }
    // expert profiles
    async expertsAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.expertProfileController.all()
    }
    async expertsCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.expertProfileController.create(req.body)   
    }
    async expertsUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.expertProfileController.update(req)   
    }
    async expertsRemove(req: Request, res: Response, next: NextFunction, channel: Channel){
        console.log("going to remove an expert")
        return this.expertProfileController.remove(req, res, next)
    }
    // permissions
    async permissionsAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.all()
    }
    async permissionsOne(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.one(req.params.id)
    }
    async permissionsCreate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.create(req.body)
    }
    async permissionsUpdate(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.update(req)
    }
    async permissionsRemoveById(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.permissionController.remove(req.params.roleId)
    }
    // Role has permissions
    async roleHasPermissionsAll(req: Request, res: Response, next: NextFunction, channel: Channel) {
        return this.roleHasPermissionController.all()
    }
    async rolePermissions(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const roleHasPermissionRows =  await this.roleHasPermissionController.byRole(req.params.roleId)
        console.log(roleHasPermissionRows)
        return this.permissionController.getAllbyIds(roleHasPermissionRows)
    }

    async assignPermissionByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        
        const roleId = req.params.roleId
        const permissionId = await this.permissionController.getIdByName(req.body.permissionName)
        console.log(roleId, permissionId)
        return this.roleHasPermissionController.create(roleId, permissionId)
    }
    async cancelPermissionByName(req: Request, res: Response, next: NextFunction, channel: Channel) {
        const roleId = req.params.roleId
        const permissionId = await this.permissionController.getIdByName(req.body.permissionName)
        return this.roleHasPermissionController.cancelPermission(roleId, permissionId)
    }
}