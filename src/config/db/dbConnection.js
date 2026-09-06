
import mongoose from "mongoose";
import { configDotenv } from "dotenv";
configDotenv()


export const  dbConnection=()=>{

    mongoose.connect(process.env.db_connection_string).then(()=>{console.log("db coonected succesfully");
    }).catch((error)=>{console.log("error in db connection:", error);
    })
}


