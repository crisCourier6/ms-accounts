import { AppDataSource } from "../data-source"
import { NextFunction, Request, Response } from "express"
import { StoreProfile } from "../entity/StoreProfile";

export class StoreProfileController {

    private storeProfileRepository = AppDataSource.getRepository(StoreProfile)

    async all() {
        return this.storeProfileRepository.find()
    }

    async one(id: string) {
  
        const storeProfile = await this.storeProfileRepository.findOne({
            where: { id: id }
        })

        if (!storeProfile) {
            return "unregistered storeProfile"
        }
        return storeProfile
    }

    async oneByUserId(id: string, res: Response) {
  
        const storeProfile = await this.storeProfileRepository.findOne({
            where: { userId: id }
        })

        if (!storeProfile) {
            res.status(404)
            return {message:"Tienda no encontrada"}
        }
        return storeProfile
    }

    async create(newStoreProfile: any, user?: any) {
        const { address, description, phone, webPage } = newStoreProfile;
       
           
        const storeProfile = Object.assign(new StoreProfile(), {
            address: address,
            description: description,
            phone: phone,
            webPage: webPage
        })

        const createdStoreProfile = await this.storeProfileRepository.create(storeProfile)
        if (createdStoreProfile){
            if (user){
                console.log("estoy agregando usuario a tienda")
                createdStoreProfile.user = user
            }
            
        }
        return this.storeProfileRepository.save(createdStoreProfile)
        
    }
    async update(request: any) {
        const updatedProfile = await this.storeProfileRepository.update(request.params.id, request.body)
        if (updatedProfile){
            return updatedProfile
        }
        return "Error: couldn't update user"
        
    }

    async remove(request: Request, response: Response, next: NextFunction) {
        const id = request.params.id as string

        let storeProfileToRemove = await this.storeProfileRepository.findOneBy({ id: id })
        
        if (!storeProfileToRemove) {
            return "this storeProfile not exist"
        }
        console.log("found the store to remove")
        await this.storeProfileRepository.remove(storeProfileToRemove)

        return "storeProfile has been removed"
    }

}