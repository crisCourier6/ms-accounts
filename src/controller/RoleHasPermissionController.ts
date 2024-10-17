import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { RoleHasPermission } from "../entity/RoleHasPermission"
import { Role } from "../entity/Role"
import { Permission } from "../entity/Permission"

export class RoleHasPermissionController {

    private roleHasPermissionRepository = AppDataSource.getRepository(RoleHasPermission)
    private roleRepository = AppDataSource.getRepository(Role)
    private permissionRepository = AppDataSource.getRepository(Permission)

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

    async updateRolePermissions(req: Request, res: Response) {
        const roleId = req.params.roleId;
        const permissionsArray: Permission[] = req.body.roleHasPermissions; // This is the array you're sending
        if (!roleId || !permissionsArray){
            res.status(400)
            return {message: "Error: parámetros inválidos"}
        }
        try {
            // 1. Find the role by ID
            const role = await this.roleRepository.findOne({
                where: { id: roleId },
                relations: ["roleHasPermission"], // Fetch existing permissions
            });
    
            if (!role) {
                res.status(404)
                return {message: "Error: rol no existe"}
            }
    
            // 2. Remove existing permissions
            await this.roleHasPermissionRepository.delete({ roleId: role.id });
    
            // 3. Create and save new RoleHasPermission entries
            const newPermissions = permissionsArray.map(permission => ({
                roleId: role.id,
                permissionId: permission.id,
            }));
    
            await this.roleHasPermissionRepository.save(newPermissions);

            return this.roleRepository.findOne({
                where: { id: roleId },
                relations: ["roleHasPermission", "roleHasPermission.permission"], // Include the permission details
            });
    
        } catch (error) {
            console.error("Error updating role permissions", error);
            res.status(500)
            return {message: "Error al guardar permisos"}
        }
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