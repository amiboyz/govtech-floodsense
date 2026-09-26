import { app } from "./app.js";
import { config } from "./config.js";

app.listen(config.PORT, () => {
  console.log(`FloodSense API berjalan di http://localhost:${config.PORT} (${config.DEMO_MODE ? "demo" : "database"})`);
});
