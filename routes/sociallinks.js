const { getsociallinks, getspecificsociallink, createsociallink, editsociallink, deletesociallink } = require("../controllers/sociallinks")
const { protectsuperadmin } = require("../middleware/middleware")

const router = require("express").Router()

router
.get("/getsociallinks", protectsuperadmin, getsociallinks)
.get("/getsociallinksa", getsociallinks)
.get("/getspecificsociallink", getspecificsociallink)
.get("/deletesociallink",protectsuperadmin, deletesociallink)
.post("/createsociallink", protectsuperadmin, createsociallink)
.post("/editsociallink", protectsuperadmin, editsociallink)

module.exports = router