import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { UserHasRole } from "../entity/UserHasRole"

export class UserHasRoleController {

    private userHasRoleRepository = AppDataSource.getRepository(UserHasRole)

    async all() {
        return this.userHasRoleRepository.find()
    }

    async one(id_role: string, id_user: string) {
        const userRole = await this.userHasRoleRepository.findOne({
            where: { roleId: id_role,
                     userId: id_user
                    }
        })

        if (!userRole) {
            return "user/role pair doesn't exist"
        }
        return userRole
    }

    async byRole(id: string){
        const userRole = await this.userHasRoleRepository.find({
            where: { roleId: id }
        })

        if (userRole === undefined || userRole.length == 0){
            return "user/role pair doesn't exist"
        }
        return userRole
    }

    async byUser(id: string){
        const userRoles = await this.userHasRoleRepository.find({
            where: { userId: id }
        })
        if (userRoles === undefined || userRoles.length == 0){
            return []
        }
        return userRoles
    }

    async activeByUser(id: string){
        const userRole = await this.userHasRoleRepository.find({
            where: { userId: id, activeRole: true }
        })
        if (userRole === undefined || userRole.length == 0){
            return "active user/role pairs don't exist"
        }
        return userRole
    }

    async create(user: any, role: any) {
                
        const userRole = Object.assign(new UserHasRole(), {
            roleId: role.id,
            userId: user.id,
        })

        await this.userHasRoleRepository.save(userRole)
        
        return "user/role pair has been added"
    }

    async removeByRole(id: string) {
        let userRoleToRemove = await this.userHasRoleRepository.find({ where: {roleId: id }})

        if (userRoleToRemove === undefined || userRoleToRemove.length == 0) {
            return "couldn't find users with this role"
        }

        await this.userHasRoleRepository.remove(userRoleToRemove)

        return "user/role pairs have been removed"
    }

    async removeByUser(id: string) {
        let userRoleToRemove = await this.userHasRoleRepository.find({ where: {userId: id }})

        if (userRoleToRemove === undefined || userRoleToRemove.length == 0) {
            return "couldn't find roles assigned to this user"
        }

        await this.userHasRoleRepository.remove(userRoleToRemove)

        return "user/role pairs have been removed"
    }

    async cancelRole(userId: string, roleId: string) {
        let userRoleToRemove = await this.userHasRoleRepository.find({ where: {userId: userId, roleId: roleId }})
        console.log(userRoleToRemove)
        if (userRoleToRemove === undefined || userRoleToRemove.length == 0) {
            return "role is not assigned to this user"
        }

        await this.userHasRoleRepository.remove(userRoleToRemove)

        return "user/role pair has been removed"
    }

}