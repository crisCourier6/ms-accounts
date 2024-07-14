import * as express from "express"
import * as bodyParser from "body-parser"
import { Request, Response } from "express"
import { AppDataSource } from "./data-source"
import { Routes } from "./routes"
import { User } from "./entity/User"


AppDataSource.initialize().then(async () => {
    //require("dotenv").config()
    // create express app
    const app = express()
    app.use(bodyParser.json())
    var cors = require('cors');
    const corsOptions = {
        origin: 'http://192.168.100.6:4000',
        methods: ['POST', 'GET', 'PATCH', 'DELETE'],
        allowedHeaders: ['content-type', 'Authorization', "Access-Control-Allow-Origin", "cookies", "set-cookies"]
      }
    app.use(cors(corsOptions));
    const cookieParser = require("cookie-parser")
    app.use(cookieParser())

    // register express routes from defined application routes
    Routes.forEach(route => {
        (app as any)[route.method](route.route, (req: Request, res: Response, next: Function) => {
            const result = (new (route.controller as any))[route.action](req, res, next)
            if (result instanceof Promise) {
                result.then(result => result !== null && result !== undefined ? res.send(result) : undefined)

            } else if (result !== null && result !== undefined) {
                res.json(result)
            }
        })
    })
    // setup express app here
    // ...

    // start express server
    app.listen(3000)

    // insert new users for test
    // await AppDataSource.manager.save(
    //     AppDataSource.manager.create(User, {
    //         name: "Cristóbal Vásquez",
    //         email: "cristobal.vasquez.m@usach.cl",
    //         hash: "1234abcd",
    //     })
    // )

    console.log("Express server has started on port 3000. Open http://localhost:3000/users to see results")
    console.log(process.env.DB_USER)
}).catch(error => console.log(error))
