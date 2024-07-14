import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from "typeorm"
import { User } from "./User"

@Entity()
export class StoreProfile {

    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column()
    address: string

    @Column()
    description: string

    @Column()
    phone: string

    @Column({nullable: true})
    webPage: string

    @Column({nullable: true})
    userId: string

    @OneToOne(()=> User, user=> user.storeProfile, {onDelete: "CASCADE"})
    @JoinColumn({name: "userId"})
    user: User
}
