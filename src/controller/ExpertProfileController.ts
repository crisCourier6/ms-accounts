import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { ExpertProfile } from "../entity/ExpertProfile"

export class ExpertProfileController {

    private expertProfileRepository = AppDataSource.getRepository(ExpertProfile)
    // all()
    // entradas: -
    // salidas: ExpertProfile[]
    // retorna todas las filas en la tabla ExpertProfile
    async all() {
        return this.expertProfileRepository.find()
    }
    // one(id: string)
    // entradas: id: uuid del experto que se quiere encontrar
    // salidas: ExpertProfile
    // recibe la uuid del experto y retorna la fila que la contiene. Si la uuid no existe, retorna un mensaje de error
    async one(id: string, res: Response) {
  
        const expertProfile = await this.expertProfileRepository.findOne({
            where: { id: id }
        })

        if (!expertProfile) {
            res.status(404)
            return {message: "Error: Experto no encontrado"}
        }
        return expertProfile
    }
    // oneByUserId(id: string)
    // entradas: id: id de User del experto que se quiere encontrar
    // salidas: ExpertProfile
    // recibe la uuid de User del experto y retorna la fila que la contiene. Si la uuid no existe, retorna un mensaje de error
    async oneByUserId(id: string, res: Response) {
  
        const expertProfile = await this.expertProfileRepository.findOne({
            where: { userId: id }
        })

        if (!expertProfile) {
            res.status(404)
            return {message:"Error: Experto no encontrado"}
        }
        return expertProfile
    }
    // create(newExpertProfile: any, user?: any)
    // entradas: newExpertProfile: request con los datos del nuevo experto
    //           user: User asociado al perfil de experto
    // salidas: ExpertProfile nuevo
    // recibe los datos del perfil de experto que se creará y el User al que el perfil estará asociado
    async create(newExpertProfile: any, res: Response, user?: any) {
        const { address, description, phone, webPage, specialty, isCoach, isNutritionist } = newExpertProfile;
        const expertProfile = Object.assign(new ExpertProfile(), {
            address: address,
            description: description,
            phone: phone,
            webPage: webPage,
            specialty: specialty,
            isCoach: isCoach,
            isNutritionist: isNutritionist
        })

        const createdExpertProfile = await this.expertProfileRepository.create(expertProfile)
        if (createdExpertProfile){
            if (user){
                createdExpertProfile.user = user
            }
            return this.expertProfileRepository.save(createdExpertProfile)
        }
        else{
            res.status(500)
            return {message: "Error al crear perfil de experto"}
        }
        
        
    }
    // update(req: Request, res: Response)
    // entradas: req: trae la id del experto que se quiere modificar (req.params.id) y los datos (request.body)
    // salidas: resultado de la modificación. si el campo affected === 1 la modificación fue exitosa
    async update(req: Request, res:Response) {
        const updatedExpert = await this.expertProfileRepository.update(req.params.id, req.body)
        if (updatedExpert){
            return updatedExpert
        }
        res.status(500)
        return {message: "Error al modificar experto"}
        
    }
    // remove(req: Request, res: Response)
    // entradas: req: trae la id del experto que se quiere eliminar (req.params.id)
    // salidas: ExpertProfile eliminado
    async remove(req: Request, res: Response) {
        const id = req.params.id 
        if (!id){
            res.status(400)
            return {message: "Error: id inválida"}
        }
        let expertProfileToRemove = await this.expertProfileRepository.findOneBy({ id: id })
        
        if (!expertProfileToRemove) {
            res.status(404)
            return {message: "Error: Experto no encontrado"}
        }
        return this.expertProfileRepository.remove(expertProfileToRemove)

    }

}