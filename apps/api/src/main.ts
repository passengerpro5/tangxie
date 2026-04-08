import { createServer } from "node:http";

import { AppModule } from "./app.module.ts";

const port = Number(process.env.PORT ?? 3000);
const handler = AppModule.createHandler();

const server = createServer(handler);

if (import.meta.url === new URL(process.argv[1] ?? "", "file://").href) {
  server.listen(port, () => {
    console.log(`API listening on http://127.0.0.1:${port}`);
  });
}

export { server };
