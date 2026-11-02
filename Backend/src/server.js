import "dotenv/config";
import server from "./server/index.js";

const port = process.env.PORT || 5000;
const host = process.env.HOST || "0.0.0.0";
server.listen(port, host, () => {
  console.log(`Server is running on port ${port}`);
});
