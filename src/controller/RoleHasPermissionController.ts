import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { RoleHasPermission } from "../entity/RoleHasPermission"

export class RoleHasPermissionController {

    private roleHasPermissionRepository = AppDataSource.getRepository(RoleHasPermission)

    async all() {
        return this.roleHasPermissionRepository.find()
    }

    async one(id_role: string, id_permission: string) {
        const rolePermission = await this.roleHasPermissionRepository.findOne({
            where: { roleId: id_role,
                     permissionId: id_permission
                    }
        })

        if (!rolePermission) {
            return "role/permission pair doesn't exist"
        }
        return rolePermission
    }

    async byRole(id: string){
        const rolePermission = await this.roleHasPermissionRepository.find({
            where: { roleId: id }
        })

        if (rolePermission === undefined || rolePermission.length == 0){
            return "role/permission pair doesn't exist"
        }
        return rolePermission
    }

    async byPermission(id: string){
        const rolePermissions = await this.roleHasPermissionRepository.find({
            where: { permissionId: id }
        })
        console.log(rolePermissions)
        if (rolePermissions === undefined || rolePermissions.length == 0){
            return "role/permission pair doesn't exist"
        }
        return rolePermissions
    }

    async create(roleId: any, permissionId: any) {
                
        const rolePermission = Object.assign(new RoleHasPermission(), {
            roleId: roleId,
            permissionId: permissionId,
        })

        await this.roleHasPermissionRepository.save(rolePermission)
        
        return "role/permission pair has been added"
    }

    async removeByRole(id: string) {
        let rolePermissionToRemove = await this.roleHasPermissionRepository.find({ where: {roleId: id }})

        if (rolePermissionToRemove === undefined || rolePermissionToRemove.length == 0) {
            return "couldn't find role"
        }

        await this.roleHasPermissionRepository.remove(rolePermissionToRemove)

        return "role/permission pairs have been removed"
    }

    async removeByPermission(id: string) {
        let rolePermissionToRemove = await this.roleHasPermissionRepository.find({ where: {permissionId: id }})

        if (rolePermissionToRemove === undefined || rolePermissionToRemove.length == 0) {
            return "couldn't find roles with this permission"
        }

        await this.roleHasPermissionRepository.remove(rolePermissionToRemove)

        return "role/permission pairs have been removed"
    }

    async cancelPermission(roleId: string, permissionId: string) {
        let rolePermissionToRemove = await this.roleHasPermissionRepository.find({ where: {permissionId: permissionId, roleId: roleId }})
        console.log(rolePermissionToRemove)
        if (rolePermissionToRemove === undefined || rolePermissionToRemove.length == 0) {
            return "permission is not assigned to this role"
        }

        await this.roleHasPermissionRepository.remove(rolePermissionToRemove)

        return "role/permission pair has been removed"
    }

}