import { AppDataSource } from "../data-source"
import { Request, Response } from "express"
import { Role } from "../entity/Role"
import { In } from "typeorm"

export class RoleController {

    private readonly roleRepository = AppDataSource.getRepository(Role)

    async all(req:Request, res:Response) {
        const withPermissions = req.query.wp === "true"
        const withUsers = req.query.wu === "true"

        const queryBuilder = this.roleRepository.createQueryBuilder("role")

        // Apply filtering based on the flags
        if (withPermissions) {
            queryBuilder.leftJoinAndSelect("role.roleHasPermission", "roleHasPermission")
                .leftJoinAndSelect("roleHasPermission.permission", "permission")
        }
        if (withUsers) {
            queryBuilder.leftJoinAndSelect("role.userHasRole", "userHasRole")
                .leftJoinAndSelect("userHasRole.user", "user")
        }

        return queryBuilder.getMany();
    }

    async one(id: string) {
        const role = await this.roleRepository.findOne({
            where: { id: id },
            relations: ["roleHasPermission", "roleHasPermission.permission"]
        })

        if (!role) {
            return "role doesn't exist"
        }
        return role
    }

    async oneByName(name: string){
        const role = await this.roleRepository.findOne({
            where: { name: name }
        })

        if (!role){
            return "role doesn't exist"
        }
        return role
    }

    async getIdByName(name: string){
        const role = await this.roleRepository.findOne({
            where: { name: name }
        })

        if (!role){
            return "role doesn't exist"
        }
        return role.id
    }

    async getAllbyIds(userRolePairs: any){
        const ids = []
        if (!userRolePairs || userRolePairs.length===0){
            return {roles: []}
        }
        userRolePairs.forEach(element => {
            ids.push(element.roleId)
        });
        const roles = await this.roleRepository.find({where: {id: In(ids)}})
        if (!roles){
            return {}
        }
        return {roles: roles.map(({name})=>name)}
    }

    async create(newRole) {
        const { name, description} = newRole;
                
        const role = Object.assign(new Role(), {
            name: name,
            description: description
        })

        const createdRole = await this.roleRepository.save(role)
        if (createdRole){
            return createdRole
        }
        return "Error: couldn't add new role"
    }
    async update(request: Request, response: Response) {
        const { id } = request.params
        if (!id){
            response.status(400)
            return {message: "Error: id inválida"}
        }
        const updatedRole = await this.roleRepository.update(id, request.body)
        if (updatedRole.affected == 1){
            return this.roleRepository.findOne({where: {id:id}})
        }
        response.status(500)
        return {message: "Error al modificar rol"}
        
    }

    async remove(req: Request, res: Response) {
        const {id} = req.params
        if (!id){   
            res.status(400)
            return {message: "Error: Id inválida"}
        }
        let roleToRemove = await this.roleRepository.findOneBy({ id: id })

        if (!roleToRemove) {
            res.status(404)
            return {message: "Error: Rol no existe"}
        }

        return this.roleRepository.remove(roleToRemove)
    }

}