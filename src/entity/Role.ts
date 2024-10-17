import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm"
import { UserHasRole } from "./UserHasRole"
import { RoleHasPermission } from "./RoleHasPermission"

@Entity()
export class Role {

    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({unique: true})
    name: string

    @Column()
    description: string

    @OneToMany(()=>UserHasRole, userHasRole=>userHasRole.role)
    userHasRole: UserHasRole[]

    @OneToMany(()=>RoleHasPermission, roleHasPermission=>roleHasPermission.role)
    roleHasPermission: RoleHasPermission[]

}
