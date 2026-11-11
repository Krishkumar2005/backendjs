import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({
    limit: "20kb"
}))

app.use(express.urlencoded({
    extended: true,
    limit: "20kb"
}))

app.use(express.static("public"))// store the assets(files, folders) in public folder like images, pdfs, favicons etc.
app.use(cookieParser())


//routes import
import userRouter from "./routes/user.routes.js"; // userRouter mann chaha name tabhi de sakte ho jab export default ho rha ho

//routes declaration
app.use("/api/v1/users", userRouter);

//http://localhost:8000/api/v1/users/register


export {app}