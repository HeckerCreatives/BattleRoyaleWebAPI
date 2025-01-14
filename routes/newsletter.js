const router = require("express").Router();


const { getnewsletterlist, deletenewsletter, createnewsletter, editnewsletter } = require("../controllers/newsletter");
const { protectsuperadmin } = require("../middleware/middleware")

const upload = require("../middleware/uploadpics")

const uploadimg = upload.single("bannerimg")

router
 .get("/getnewsletterlist", protectsuperadmin, getnewsletterlist)
 .get("/deletenewsletter", protectsuperadmin, deletenewsletter)
 .post("/createnewsletter", protectsuperadmin, function (req, res, next) {
    uploadimg(req, res, function(err){
        if(err) {
            return res.status(400).send({ message: "failed", data: err.message})
        }

        next()
    })
 } , createnewsletter)
 .post("/editnewsletter", protectsuperadmin, function (req, res, next) {
    uploadimg(req, res, function(err){
        if(err) {
            return res.status(400).send({ message: "failed", data: err.message})
        }

        next()
    })
 } , editnewsletter)

module.exports = router