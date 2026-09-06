import { createQuestion, deleteQuestion, getQuestionBySlug, getQuestions, searchQuestion, searchQuestionsByName, updateQuestion } from '../controllers/questionController.js'

import  express from 'express'
const questionRouter = express.Router()


questionRouter.get("/",getQuestions)
questionRouter.get('/get/:slug',getQuestionBySlug)
questionRouter.get('/search/:name',searchQuestionsByName)

// // admin
questionRouter.post('/new',createQuestion)
questionRouter.put('/update/:id',updateQuestion)
questionRouter.delete('/delete/:id',deleteQuestion)



export default questionRouter
