const { updatefilemetadata, uploadmetadata, unpin } = require("../controllers/pinata")
const { protectplayer } = require("../middleware/middleware")

const router = require("express").Router()


router
 .post("/updatefilemetadata", protectplayer, updatefilemetadata)
 .post("/uploadmetadata", protectplayer, uploadmetadata)
 .post("/unpin", protectplayer, unpin)

module.exports = router;