const router = require('express').Router();

const { getActiveVersion, editversion } = require('../controllers/version');
const { protectsuperadmin } = require('../middleware/middleware');

router
    .get("/getactiveversion", protectsuperadmin, getActiveVersion)
    .post("/editversion", protectsuperadmin, editversion);
module.exports = router;