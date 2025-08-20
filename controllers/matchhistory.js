const Matchhistory = require("../models/Matchhistory")


exports.getplayermatchhistory = async (req, res) => {
    const { id, username } = req.user
    const { playerid, page, limit } = req.query
    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }
    try {
        const matchHistory = await Matchhistory.find({ playerid })
            .populate('owner', 'username')
            .skip((pageOptions.page - 1) * pageOptions.limit)
            .limit(pageOptions.limit)
            .sort({ createdAt: -1 })
        const totalCount = await Matchhistory.countDocuments({ playerid })
        const totalPages = Math.ceil(totalCount / pageOptions.limit)
        const formattedData = matchHistory.map(match => ({
            id: match._id,
            player: match.owner.username,
            kills: match.kill,
            placement: match.placement,
            createdAt: match.createdAt,
        }))
        return res.json({ message: "success", data: formattedData, pagination: { totalCount, totalPages } })
    } catch (err) {
        console.log(`Error getting match history for ${username}: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting match history." })
    }
}