import * as express from "express"
import * as bodyParser from "body-parser"
import { Request, Response } from "express"
import { AppDataSource } from "./data-source"
import { Routes } from "./routes"
import * as amqp from "amqplib/callback_api"
import "dotenv/config"

// Conexión con la base de datos (ver data-source.ts)
AppDataSource.initialize().then(async () => {
    // Conexión con el broker de mensajes (RabbitMQ)
    amqp.connect(process.env.RABBITMQ_URL, (error0, connection) => {
        if(error0){
            throw error0
        }
        // ms-accounts crea el canal Accounts donde publica mensajes para los demas microservicios
        connection.createChannel((error1, channel)=>{
            if (error1){
                throw error1
            }
            channel.assertExchange("Accounts", "topic", {durable: false})
            const app = express()
            app.use(bodyParser.json())
            var cors = require('cors');  // las opciones cors resolvían un problema con las requests del front, pero creo que ya no son necesarias
            const corsOptions = {         
                origin: [process.env.EF_MAIN_LOCAL, process.env.EF_MAIN_REMOTE, process.env.EF_ADMIN_LOCAL, process.env.EF_ADMIN_REMOTE],
                methods: ['POST', 'GET', 'PATCH', 'DELETE'],
                allowedHeaders: ['content-type', 'Authorization', "Access-Control-Allow-Origin", "cookies", "set-cookies"]
            }
            app.use(cors(corsOptions));
            const cookieParser = require("cookie-parser") // cookieParser sería utilizado para obtener las cookies de las requests,
            app.use(cookieParser())                     // en específico, la jason web token, que debiera ser httponly,
                                                        // lo cual requiere que las requests vengan de una url https.
                                                        // Por el momento, la jwt viene en el header Authorization, y en el front se 
                                                        // guarda en el local storage del navegador
            
            // mapeo de las rutas (endpoints) de routes.ts. Para todas las rutas, el controller es MainController, en donde
            // se llama al resto de los controladores. Este mapeo viene escrito por defecto al crear proyectos con el comando
            // typeorm ()                                            
            Routes.forEach(route => {
                (app as any)[route.method](route.route, (req: Request, res: Response, next: Function) => {
                    const result = (new (route.controller as any))[route.action](req, res, next, channel)
                    if (result instanceof Promise) {
                        result.then(result => result !== null && result !== undefined ? res.send(result) : undefined)

                    } else if (result !== null && result !== undefined) {
                        res.json(result)
                    }
                })
            })

            app.listen(process.env.PORT)

            console.log(`Express server has started on port ${process.env.PORT}. Open ${process.env.LOCAL_URL}:${process.env.PORT}/users to see results`)
            process.on("beforeExit", ()=>{
                console.log("closing")
                connection.close()
            })
        })
    })
}).catch(error => console.log(error))
