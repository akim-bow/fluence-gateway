import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify from "fastify";
import dotenv from "dotenv";

// Runtime dependencies required for this function. Vercel imports only direct listed dependencies.
(() => [
  import("@fluencelabs/js-client"),
  import("@fastify/rate-limit"),
  import("@sinclair/typebox"),
  import("../dist/compiled-aqua/main.js"),
  import("../dist/relays.json", { assert: { type: "json" } }),
])();

dotenv.config();

const server = fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

await server.register(import("../dist/app/index.js"));

export default async function (req: Request, res: Response) {
  await server.ready();
  server.server.emit("request", req, res);
}
