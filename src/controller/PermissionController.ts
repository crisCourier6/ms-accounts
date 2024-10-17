import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { Permission } from "../entity/Permission"
import { In } from "typeorm"

export class PermissionController {

    private permissionRepository = AppDataSource.getRepository(Permission)

    async all() {
        return this.permissionRepository.find()
    }

    async one(id: string) {
        const role = await this.permissionRepository.findOne({
            where: { id: id }
        })

        if (!role) {
            return "permission doesn't exist"
        }
        return role
    }

    async oneByName(name: string){
        const role = await this.permissionRepository.findOne({
            where: { name: name }
        })

        if (!role){
            return "permission doesn't exist"
        }
        return role
    }

    async getIdByName(name: string){
        const role = await this.permissionRepository.findOne({
            where: { name: name }
        })

        if (!role){
            return "permission doesn't exist"
        }
        return role.id
    }

    async getAllbyIds(userPermissionPairs: any){
        const ids = []
        userPermissionPairs.forEach(element => {
            ids.push(element.permissionId)
        });
        console.log(ids)
        const permissions = await this.permissionRepository.find({where: {id: In(ids)}})
        if (!permissions){
            return "No se encontraron permisos"
        }
        return permissions
    }

    async create(newPermission) {
        const { name, description} = newPermission;
                
        const role = Object.assign(new Permission(), {
            name: name,
            description: description
        })

        const createdPermission = await this.permissionRepository.save(role)
        if (createdPermission){
            return createdPermission
        }
        return "Error: couldn't add new permission"
    }
    async update(request: Request, response: Response) {
        const { id } = request.params
        if (!id){
            response.status(400)
            return {message: "Error: id inválida"}
        }
        const updatedPermission = await this.permissionRepository.update(id, request.body)
        if (updatedPermission.affected == 1){
            return this.permissionRepository.findOne({where: {id:id}})
        }
        response.status(500)
        return {message: "Error al modificar permiso"}
        
    }

    async remove(req: Request, res: Response) {
        const {id} = req.params
        if (!id){   
            res.status(400)
            return {message: "Error: Id inválida"}
        }
        let permissionToRemove = await this.permissionRepository.findOneBy({ id: id })

        if (!permissionToRemove) {
            res.status(404)
            return {message: "Error: Rol no existe"}
        }

        return this.permissionRepository.remove(permissionToRemove)
    }

}