import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { ExpertProfile } from "../entity/ExpertProfile"

export class ExpertProfileController {

    private expertProfileRepository = AppDataSource.getRepository(ExpertProfile)

    async all() {
        return this.expertProfileRepository.find()
    }

    async one(id: string) {
  
        const expertProfile = await this.expertProfileRepository.findOne({
            where: { id: id }
        })

        if (!expertProfile) {
            return "unregistered expertProfile"
        }
        return expertProfile
    }

    async create(newExpertProfile: any, user?: any) {
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
                console.log("estoy agregando usuario a experto")
                createdExpertProfile.user = user
            }
            
        }
        return this.expertProfileRepository.save(createdExpertProfile)
        
    }
    async update(request: any) {
        const updatedExpert = await this.expertProfileRepository.update(request.params.id, request.body)
        if (updatedExpert){
            return updatedExpert
        }
        return "Error: couldn't update expert"
        
    }

    async remove(request: Request, response: Response, next: NextFunction) {
        const id = request.params.id as string

        let expertProfileToRemove = await this.expertProfileRepository.findOneBy({ id: id })
        
        if (!expertProfileToRemove) {
            return "this expertProfile not exist"
        }
        console.log("found the expert to remove")
        await this.expertProfileRepository.remove(expertProfileToRemove)

        return "expertProfile has been removed"
    }

}