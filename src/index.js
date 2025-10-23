//require("dotenv").config({path: './.env'});
import { app } from "./app.js";
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env" 
});


connectDB()
    .then(() => {

        app.on('error', (err) => {
            console.error("Server error:", err);
            throw err; // Re-throw the error to be caught by the catch block
        });
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port: ${process.env.PORT || 8000}`);
        });
    })
    .catch((error) => {
        console.error("Failed to connect to the MONGODB:", error);       
    });