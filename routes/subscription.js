const { Subscribe, Unsubscribe, getSubscribers, getSubscriberlist, DeleteSubscribersByIds } = require("../controllers/subscription")
const { protectsuperadmin } = require("../middleware/middleware")

const router = require("express").Router()

router
 .post("/subscribe", Subscribe)
 .post("/unsubscribe", Unsubscribe)
 .get("/getsubscribers", getSubscribers)
 .get("/getsubscriberlist", protectsuperadmin, getSubscriberlist)
 .post("/deletesubscribersbyids", protectsuperadmin, DeleteSubscribersByIds)

module.exports = router