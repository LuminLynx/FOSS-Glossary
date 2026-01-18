import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/health", (_: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

