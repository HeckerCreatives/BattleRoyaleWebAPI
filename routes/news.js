const router = require("express").Router()
const { createnews, getnewslist, editnews, deletenews} = require("../controllers/News")
const { protectsuperadmin } = require("../middleware/middleware")
const upload = require("../middleware/picuploads")

const uploadimg = upload.single('bannerimg')

router
    .get("/getnewslist", getnewslist)
    .get("/deletenews", protectsuperadmin, deletenews)
    .post("/createnews", protectsuperadmin, function (req, res, next){
        uploadimg(req, res, function(err) {
            if (err){
                console.log(`Server error: ${err}`)
                return res.status(400).send({ message: "failed", data: "There's a problem with the server! Please try again later." })
            }
            next()
        })
    }, createnews)
    .post("/editnews", protectsuperadmin, function (req, res, next){
        uploadimg(req, res, function(err) {
            if (err){
                console.log(`Server error: ${err}`)
                return res.status(400).send({ message: "failed", data: "There's a problem with the server! Please try again later." })
            }
            next()
        })
    }, editnews)

module.exports = router;
