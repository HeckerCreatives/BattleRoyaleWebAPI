const { default: mongoose } = require("mongoose");
const { Leaderboard, LeaderboardHistory } = require("../models/Leaderboard");
const Season = require("../models/Season");

exports.getleaderboard = async (req, res) => {
    const {id, username} = req.user

    const lbdata = await Leaderboard.find()
    .populate({
        path: "owner",
        select: "username"
    })
    .limit(50)
    .sort({amount: -1, updatedAt: -1}) // Sort by amount descending, then by updatedAt descending
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the leaderboard`)
    })

    if (lbdata.length <= 0){
        return res.json({message: "success", data: {
            leaderboard: {}
        }})
    }

    let tempindex = 0;

    const data = {
        leaderboard: {}
    }

    lbdata.forEach(tempdata => {
        const {owner, amount} = tempdata

        data.leaderboard[tempindex] = {
            user: owner.username,
            amount: amount
        };

        tempindex++;
    })

    return res.json({message: "success", data: data})
}
exports.updateuserleaderboard = async (req, res) => {
    const {id, username} = req.user

    const  { amount } = req.body

   await Leaderboard.findOneAndUpdate(
    {
        owner: new mongoose.Types.ObjectId(id),
    },
    {
        $inc: {
            amount: parseInt(amount)
        }
    })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem updating the leaderboard data for user: ${username}. Error: ${err}`)
        return res.status(400).json({message: "bad-request", data: "There's a problem with the server! Please contact customer support for more details." })
    })

    return res.json({ message: "success" })
}

exports.resetleaderboard = async (req, res) => {
    try {
        // Get current leaderboard data before resetting
        const currentLeaderboard = await Leaderboard.find({ amount: { $gt: 0 } })
            .populate({
                path: "owner",
                select: "username"
            })
            .sort({ amount: -1, updatedAt: -1 })
            .limit(1000)

        if (currentLeaderboard.length > 0) {
            // Find the next available index for this reset event
            const latestHistory = await LeaderboardHistory.findOne()
                .sort({ index: -1 })
                .select('index');
            const currentSeason = await Season.findOne({ status: "active" })
            if (!currentSeason) {
                return res.status(400).json({
                    message: "bad-request",
                    data: "No active season found. Cannot reset leaderboard."
                });
            }
            const nextIndex = latestHistory ? latestHistory.index + 1 : 1;
            
            // Create history entries for all users with scores > 0
            const historyEntries = currentLeaderboard.map((entry, position) => ({
                owner: entry.owner._id,
                eventname: `${currentSeason.title} - Reset #${nextIndex}`,
                index: nextIndex,
                amount: entry.amount,
                date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            }));

            // Save history entries
            await LeaderboardHistory.insertMany(historyEntries);
        }

        // Reset the leaderboard
        await Leaderboard.updateMany({}, { $set: { amount: 0 } });

        return res.json({ message: "success" });
    } catch (error) {
        console.log(`Error resetting leaderboard: ${error}`);
        return res.status(500).json({ 
            message: "error", 
            data: "There was a problem resetting the leaderboard. Please contact customer support." 
        });
    }
}

exports.getleaderboardhistory = async (req, res) => {
    try {
        const { index } = req.query; // Optional: get specific index, if not provided get all

        let query = {};
        if (index) {
            query.index = parseInt(index);
        }

        const historyData = await LeaderboardHistory.find(query)
            .populate({
                path: "owner",
                select: "username"
            })
            .sort({ index: -1, amount: -1 }) // Sort by index (newest first), then by amount (highest first)
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem getting the leaderboard history: ${err}`);
                return res.status(500).json({
                    message: "error", 
                    data: "There was a problem retrieving leaderboard history."
                });
            });

        if (!historyData || historyData.length <= 0) {
            return res.json({
                message: "success", 
                data: {
                    history: {},
                    totalEvents: 0
                }
            });
        }

        // Group by index
        const groupedHistory = {};
        const eventDetails = {};

        historyData.forEach(entry => {
            const { index, owner, amount, eventname, date } = entry;
            
            // Initialize the index group if it doesn't exist
            if (!groupedHistory[index]) {
                groupedHistory[index] = [];
                eventDetails[index] = {
                    eventname: eventname,
                    date: date,
                    totalParticipants: 0
                };
            }

            // Add user to the group
            groupedHistory[index].push({
                user: owner.username,
                amount: amount,
                position: groupedHistory[index].length + 1
            });

            eventDetails[index].totalParticipants++;
        });

        // Format the response
        const formattedHistory = {};
        Object.keys(groupedHistory).forEach(index => {
            formattedHistory[index] = {
                eventInfo: eventDetails[index],
                leaderboard: groupedHistory[index]
            };
        });

        return res.json({
            message: "success", 
            data: {
                history: formattedHistory,
                totalEvents: Object.keys(formattedHistory).length
            }
        });

    } catch (error) {
        console.log(`Error getting leaderboard history: ${error}`);
        return res.status(500).json({ 
            message: "error", 
            data: "There was a problem retrieving leaderboard history. Please contact customer support." 
        });
    }
}

exports.getleaderboardhistoryoptions = async (req, res) => {
    try {
        // Get unique index values with their corresponding event details
        const historyOptions = await LeaderboardHistory.aggregate([
            {
                $group: {
                    _id: "$index",
                    eventname: { $first: "$eventname" },
                    date: { $first: "$date" },
                    index: { $first: "$index" }
                }
            },
            {
                $sort: { index: -1 } // Sort by index descending (newest first)
            },
            {
                $project: {
                    _id: 0,
                    index: "$index",
                    name: "$eventname",
                }
            }
        ]);

        if (!historyOptions || historyOptions.length <= 0) {
            return res.json({
                message: "success", 
                data: {
                    options: [],
                    totalOptions: 0
                }
            });
        }

        return res.json({
            message: "success", 
            data: {
                options: historyOptions,
                totalOptions: historyOptions.length
            }
        });

    } catch (error) {
        console.log(`Error getting leaderboard history options: ${error}`);
        return res.status(500).json({ 
            message: "error", 
            data: "There was a problem retrieving leaderboard history options. Please contact customer support." 
        });
    }
}