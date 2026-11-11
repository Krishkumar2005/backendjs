import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app } from "./app.js";

dotenv.config({path: "./.env"});

const PORT = process.env.PORT || 8000

connectDB()
.then(() => {
    
    app.on("error", (error) => {
        console.log("ERRR: ", error);
        throw error
    })


    app.listen(PORT, () => {
        console.log(`App is listening on port ${PORT}`);
    });
})

.catch((error) => {
    console.log("MONGO db connection failed !!! ", error);
    throw error
})































//require("dotenv").config({path: "./.env"});

// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import express from "express";
// import { DB_NAME } from "./constants.js";
// dotenv.config({path: "./.env"});

// const app = express();

// ( async () => {
//   try {
//       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//       app.on("error", (error) => {
//           console.log("ERRR: ", error);
//           throw error
//       })

//       app.listen(process.env.PORT, () => {
//           console.log(`App is listening on port ${process.env.PORT}`);
//       })

//   } catch (error) {
//       console.error("ERROR1: ", error)
//       throw error
//   }
// })()
