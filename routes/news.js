const router = require("express").Router();

const { getnewslist, createNews, editNews, deleteNews, messageNews } = require("../controllers/News")

const { protectsuperadmin } = require("../middleware/middleware")

const upload = require("../middleware/uploadpics")

const uploadimg = upload.single("bannerimg")

router
 .get("/getnewslist", protectsuperadmin, getnewslist)
 .get("/deletenews", protectsuperadmin, deleteNews)
 .post("/messagenews", protectsuperadmin, messageNews)
 .post("/createnews", protectsuperadmin, function (req, res, next) {
    uploadimg(req, res, function(err){
        if(err) {
            return res.status(400).send({ message: "failed", data: err.message})
        }

        next()
    })
 } , createNews)
 .post("/editnews", protectsuperadmin, function (req, res, next) {
    uploadimg(req, res, function(err){
        if(err) {
            return res.status(400).send({ message: "failed", data: err.message})
        }

        next()
    })
 } , editNews)

module.exports = router