import { createApp } from "./api/server.ts";

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => console.log(`Agent Support Copilot running at http://localhost:${port}`));

