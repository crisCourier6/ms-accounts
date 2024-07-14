import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm"
import { RoleHasPermission } from "./RoleHasPermission"

@Entity()
export class Permission {

    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({unique: true})
    name: string

    @Column()
    description: string

    @OneToMany(()=>RoleHasPermission, roleHasPermission=>roleHasPermission.permissionId)
    roleHasPermission: RoleHasPermission[]

}