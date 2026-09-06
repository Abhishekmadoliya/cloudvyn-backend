


import express from 'express'
import { getCategory } from '../controllers/categoryController.js';
 const Router = express.Router();


Router.get('/category',getCategory)

export default Router









