import cors from 'cors'
import express from 'express'
import { PORT } from './config/config.js';

const app = express();
app.use(cors())
app.use(express.json())

app.get("/", (_,res)=>{
    res.status(200).json({success: true, message: "Connection success"})
})

app.listen(PORT, ()=>{
    console.log("Server run in port: ", PORT)
})