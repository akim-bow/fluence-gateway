import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify from "fastify";
import dotenv from "dotenv";
import AppPlugin from "../dist/app/index.js";

dotenv.config();

const server = fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

await server.register(AppPlugin);

export default async function (req: Request, res: Response) {
  await server.ready();
  server.server.emit("request", req, res);
}
