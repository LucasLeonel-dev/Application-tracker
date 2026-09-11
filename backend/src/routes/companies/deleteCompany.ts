import { request } from "node:http";
import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";

export default async function deleteCompany(app: FastifyInstance){
    app.delete('/companies/:id', {preHandler: [app.authenticate]}, async(request, reply){
        const {sub: userId} = request.user;
        const {id} = request.params as {id: string};

        
    })
} 