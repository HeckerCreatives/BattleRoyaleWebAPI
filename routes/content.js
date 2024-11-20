const { createContent, editContent, getContent, deleteContent, massMapContent } = require("../controllers/content")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")


const upload = require("../middleware/uploadpics")

const uploadimg = upload.single("link")
const uploadimgs = upload.array("image", 10)

const router = require("express").Router()

router
 .post("/createcontent", protectsuperadmin, function (req, res, next){
        uploadimg(req, res, function(err){
            if(err){
                return res.status(400).send({ message: "failed", data: err.message })
            }
            next()
        })
 }, createContent)
 .post("/editcontent", protectplayer, function (req, res, next){
    uploadimg(req, res, function(err){
        if(err){
            return res.status(400).send({ message: "failed", data: err.message })
        }
        next()
    })
}, editContent)
.post("/mapcontent", protectsuperadmin, function(req, res, next){
    uploadimgs(req, res, function(err){
        if(err){
            return res.status(400).send({ message: "failed", data: err.message})
        }
        next()
    })
}, massMapContent)
.get("/getcontent", getContent)
.get("/deletecontent", protectplayer, deleteContent)

module.exports = router