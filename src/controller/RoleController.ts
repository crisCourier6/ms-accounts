import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { Role } from "../entity/Role"
import { In } from "typeorm"

export class RoleController {

    private roleRepository = AppDataSource.getRepository(Role)

    async all() {
        return this.roleRepository.find()
    }

    async one(id: string) {
        const role = await this.roleRepository.findOne({
            where: { id: id }
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
        userRolePairs.forEach(element => {
            ids.push(element.roleId)
        });
        console.log(ids)
        const roles = await this.roleRepository.find({where: {id: In(ids)}})
        if (!roles){
            return []
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
    async update(request: any) {
        const updatedRole = await this.roleRepository.update(request.params.id, request.body)
        if (updatedRole){
            return updatedRole
        }
        return "Error: couldn't update role"
        
    }

    async remove(id: string) {
        let roleToRemove = await this.roleRepository.findOneBy({ id: id })

        if (!roleToRemove) {
            return "this role doesn't exist"
        }

        await this.roleRepository.remove(roleToRemove)

        return "role has been removed"
    }

}