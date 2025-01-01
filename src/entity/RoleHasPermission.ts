import { Entity, ManyToOne, PrimaryColumn, Unique, JoinColumn } from "typeorm"
import { Permission } from "./Permission"
import { Role } from "./Role"

@Entity()
@Unique(["roleId", "permissionId"])
export class RoleHasPermission {

    @PrimaryColumn()
    roleId: string

    @PrimaryColumn()
    permissionId: string

    @ManyToOne(()=>Permission, permission => permission.roleHasPermission, {onDelete: "CASCADE"})
    @JoinColumn({name: "permissionId"})
    permission: Permission

    @ManyToOne(()=>Role, role => role.roleHasPermission, {onDelete: "CASCADE"})
    @JoinColumn({name: "roleId"})
    role: Role
}