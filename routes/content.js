const { createContent, editContent, getContent, deleteContent, massMapContent, editMapContent } = require("../controllers/content")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")


const upload = require("../middleware/uploadpics")

const uploadimg = upload.single("link")
const uploadimgs = upload.array("link", 10)

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
 .post("/editcontent", protectsuperadmin, function (req, res, next){
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
.post("/editmapcontent", protectsuperadmin, function(req, res, next){
    uploadimg(req, res, function(err){
        if(err){
            return res.status(400).send({ message: "failed", data: err.message})
        }
        next()
    })
}, editMapContent)
.get("/getcontent", getContent)
.get("/deletecontent", protectsuperadmin, deleteContent)

module.exports = router