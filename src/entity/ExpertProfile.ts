import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from "typeorm"
import { User } from "./User"

@Entity()
export class ExpertProfile {

    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({nullable: true})
    address: string

    @Column()
    description: string

    @Column({nullable: true})
    phone: string

    @Column({nullable: true})
    webPage: string

    @Column()
    specialty: string

    @Column()
    isCoach: boolean

    @Column()
    isNutritionist: boolean

    @Column({nullable: true})
    userId: string

    @OneToOne(()=> User, user=> user.expertProfile, {onDelete: "CASCADE"})
    @JoinColumn({name: "userId"})
    user: User
}
