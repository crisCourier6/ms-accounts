import { Entity, ManyToOne, PrimaryColumn, Column, Unique, ManyToMany, JoinColumn } from "typeorm"
import { User } from "./User"
import { Role } from "./Role"

@Entity()
@Unique(["roleId", "userId"])
export class UserHasRole {

    @PrimaryColumn()
    roleId: string

    @PrimaryColumn()
    userId: string

    @Column({default: true})
    activeRole: boolean

    @ManyToOne(()=>User, user => user.userHasRole, {onDelete: "CASCADE"})
    @JoinColumn({name: "userId"})
    user: User

    @ManyToOne(()=>Role, role => role.userHasRole, {onDelete: "CASCADE"})
    @JoinColumn({name: "roleId"})
    role: Role
}