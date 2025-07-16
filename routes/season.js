const router = require("express").Router()
const { 
    createseason, 
    getallseasons, 
    getcurrentseason, 
    getseasonsuperadmin,
    startseason, 
    endseason, 
    updateseason, 
    deleteseason 
} = require("../controllers/season")
const { protectplayer, protectsuperadmin, protectallusers } = require("../middleware/middleware")

router
    .post("/createseason", protectsuperadmin, createseason)
    .get("/getallseasons", protectallusers, getallseasons)
    .get("/getcurrentseason", protectallusers, getcurrentseason)
    .get("/getseasonsuperadmin", protectsuperadmin, getseasonsuperadmin)
    .post("/startseason", protectsuperadmin, startseason)
    .post("/endseason", protectsuperadmin, endseason)
    .post("/updateseason", protectsuperadmin, updateseason)
    .post("/deleteseason", protectsuperadmin, deleteseason)
    
module.exports = router;
