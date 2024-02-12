import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Fluence } from "@fluencelabs/js-client";
import relays from "./relays.json" assert { type: "json" };
import { type Static, Type } from "@sinclair/typebox";
import fastify from "fastify";

import { helloWorld, helloWorldRemote, showSubnet, runDeployedServices } from "./compiled-aqua/main.js";

// This is an authorization token for the gateway service.
// Remember to generate the appropriate token and save it in env variables.
const ACCESS_TOKEN = "abcdefhi";

// This is the peer's private key.
// It must be regenerated and properly hidden otherwise one could steal it and pretend to be this gateway.
const PEER_PRIVATE_KEY = new TextEncoder().encode(
  new Array(32).fill("a").join(""),
);

const server = fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

await server.register(import("@fastify/rate-limit"), {
  max: 100,
  timeWindow: "1 minute",
});

server.addHook("onReady", async () => {
  await Fluence.connect(relays[0], {
    keyPair: {
      type: "Ed25519",
      source: PEER_PRIVATE_KEY,
    },
  });
});

server.addHook("onRequest", async (request, reply) => {
  if (request.headers.access_token !== ACCESS_TOKEN) {
    await reply.status(403).send({
      error: "Unauthorized",
      statusCode: 403,
    });
  }
});

server.addHook("onClose", async () => {
  await Fluence.disconnect();
});

const callbackBody = Type.Object({
  name: Type.String(),
});

type callbackBodyType = Static<typeof callbackBody>;

const callbackResponse = Type.String();

type callbackResponseType = Static<typeof callbackResponse>;

const showSubnetResponse = Type.Array(
  Type.Object({
    host_id: Type.Union([Type.String(), Type.Null()]),
    services: Type.Union([Type.Array(Type.String()), Type.Null()]),
    spells: Type.Union([Type.Array(Type.String()), Type.Null()]),
    worker_id: Type.Union([Type.String(), Type.Null()]),
  }),
);

type showSubnetResponseType = Static<typeof showSubnetResponse>;

const runDeployedServicesResponse = Type.Array(
  Type.Object({
    answer: Type.Union([Type.String(), Type.Null()]),
    worker: Type.Object({
      host_id: Type.String(),
      pat_id: Type.String(),
      worker_id: Type.Union([Type.String(), Type.Null()]),
    }),
  }),
);

type runDeployedServicesResponseType = Static<typeof runDeployedServicesResponse>;

// Request and response
server.post<{ Body: callbackBodyType; Reply: callbackResponseType }>(
  "/my/callback/hello",
  { schema: { body: callbackBody, response: { 200: callbackResponse } } },
  async (request, reply) => {
    const { name } = request.body;
    const result = await helloWorld(name);
    return reply.send(result);
  },
);

// Fire and forget
server.post("/my/webhook/hello", async (_request, reply) => {
  void helloWorldRemote("Fluence");
  return reply.send();
});

server.post<{ Reply: showSubnetResponseType }>(
  "/my/callback/showSubnet",
  { schema: { response: { 200: showSubnetResponse } } },
  async (_request, reply) => {
    const result = await showSubnet();
    return reply.send(result);
  },
);

server.post<{ Reply: runDeployedServicesResponseType }>(
  "/my/callback/runDeployedServices",
  { schema: { response: { 200: runDeployedServicesResponse } } },
  async (_request, reply) => {
    const result = await runDeployedServices();
    return reply.send(result);
  },
);

server.listen({ port: 8080, host: "0.0.0.0" }, (err, address) => {
  if (err !== null) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Server listening at ${address}`);
});