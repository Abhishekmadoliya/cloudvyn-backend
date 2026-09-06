import express from "express";
import { predictText } from "../controllers/predict.controller.js";

const predictTextRouter = express.Router();

predictTextRouter.post("/", predictText);

export default predictTextRouter;
