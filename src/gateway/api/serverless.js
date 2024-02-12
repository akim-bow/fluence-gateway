import fastify from "fastify";
import dotenv from "dotenv";
dotenv.config();
const server = fastify({
    logger: true,
}).withTypeProvider();
await server.register(import("./app/index.js"));
export default async function handler(req, res) {
    await server.ready();
    server.server.emit("request", req, res);
}
