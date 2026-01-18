import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
