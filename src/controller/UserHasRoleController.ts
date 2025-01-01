import { AppDataSource } from "../data-source"
import { Request, Response } from "express"
import { UserHasRole } from "../entity/UserHasRole"
import { Role } from "../entity/Role"
import { User } from "../entity/User"

export class UserHasRoleController {

    private readonly userHasRoleRepository = AppDataSource.getRepository(UserHasRole)
    private readonly userRepository = AppDataSource.getRepository(User)

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

    async byUser(req: Request, res: Response){
        const {id} = req.params
        if (!id){
            res.status(400)
            return {message: "Error: id inválida"}
        }
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

    async updateUserRoles(req: Request, res: Response) {
        const userId = req.params.id;
        const rolesArray: Role[] = req.body.userHasRoles; // This is the array you're sending
        
        if (!userId || !rolesArray) {
            res.status(400)
            return {message: "Error: parámetros inválidos"}
        }
    
        try {
            // 1. Find the user by ID
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: ["userHasRole"], // Fetch existing roles
            });
    
            if (!user) {
                res.status(404)
                return {message: "Error: usuario no existe"}
            }
    
            // 2. Remove existing roles
            await this.userHasRoleRepository.delete({ userId: user.id });
    
            // 3. Create and save new UserHasRole entries
            const newRoles = rolesArray.map(role => ({
                userId: user.id,
                roleId: role.id,
            }));
    
            await this.userHasRoleRepository.save(newRoles);
    
            // 4. Return the updated user with the new roles
            const updatedUser = await this.userRepository.findOne({
                where: { id: userId },
                relations: ["userHasRole", "userHasRole.role"], // Include role details
            });
    
            return updatedUser
        
        } catch (error) {
            console.error("Error updating user roles", error);
            res.status(500)
            return {message: "Error al guardar roles"}
        }
    }

}