const { default: mongoose } = require("mongoose");
const { Leaderboard, LeaderboardHistory } = require("../models/Leaderboard");
const Season = require("../models/Season");
const Usergamedetails = require("../models/Usergamedetails");
const { Titles, CharacterTitles } = require("../models/Titles");
const { isEqual } = require("date-fns");
const Matchhistory = require("../models/Matchhistory");

exports.getleaderboard = async (req, res) => {
    const {id, username} = req.user
    const { page, limit } = req.query;

    const lbdata = await Leaderboard.find()
    .populate({
        path: "owner",
        select: "username"
    })
    .limit(parseInt(limit) || 50)
    .skip(((parseInt(page) || 1) - 1) * (parseInt(limit) || 50))
    .sort({amount: -1, updatedAt: -1}) // Sort by amount descending, then by updatedAt descending
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the leaderboard`)
    })

    if (lbdata.length <= 0){
        const userStats = await getMatchStats(id);
        return res.json({message: "success", data: {
            leaderboard: {},
            userStats
        }})
    }
    const totalDocuments = await Leaderboard.countDocuments();

    const totalPages = Math.ceil(totalDocuments / (parseInt(limit) || 50));
    const currentPage = parseInt(page) || 1;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Get all user IDs including current user
    const userIds = lbdata.map(lb => lb.owner._id);
    if (!userIds.some(uid => uid.toString() === id.toString())) {
        userIds.push(new mongoose.Types.ObjectId(id));
    }

    // Batch fetch all stats at once
    const allStats = await getBatchMatchStats(userIds);
    const userStats = allStats.get(id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

    let tempindex = 0;
    const data = {
        leaderboard: {},
        pagination: {
            totalDocuments,
            totalPages,
            currentPage,
            hasNextPage,
            hasPrevPage
        },
        userStats
    }

    lbdata.forEach(tempdata => {
        const {owner, amount} = tempdata;
        const matchStats = allStats.get(owner._id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

        data.leaderboard[tempindex] = {
            user: owner.username,
            amount: amount,
            totalWins: matchStats.totalWins,
            totalMatches: matchStats.totalMatches,
            playTime: matchStats.playTime
        };

        tempindex++;
    });

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

exports.getkillleaderboard = async (req, res) => {
    const {id, username} = req.user

    const lbdata = await Usergamedetails.find({kill: {$gt: 0}})
    .populate({
        path: "owner",
        select: "username"
    })
    .limit(50)
    .sort({kill: -1, updatedAt: -1})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the leaderboard`)
    })

    if (lbdata.length <= 0){
        const userStats = await getMatchStats(id);
        return res.json({message: "success", data: {
            leaderboard: {},
            userStats
        }})
    }

    // Get all user IDs including current user
    const userIds = lbdata.map(lb => lb.owner._id);
    if (!userIds.some(uid => uid.toString() === id.toString())) {
        userIds.push(new mongoose.Types.ObjectId(id));
    }

    // Batch fetch all stats at once
    const allStats = await getBatchMatchStats(userIds);
    const userStats = allStats.get(id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

    let tempindex = 0;
    const data = {
        leaderboard: {},
        userStats
    }

    lbdata.forEach(tempdata => {
        const {owner, kill} = tempdata;
        const matchStats = allStats.get(owner._id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

        data.leaderboard[tempindex] = {
            user: owner.username,
            amount: kill,
            totalWins: matchStats.totalWins,
            totalMatches: matchStats.totalMatches,
            playTime: matchStats.playTime
        };

        tempindex++;
    });

    return res.json({message: "success", data: data})
}

exports.getdeathleaderboard = async (req, res) => {
    const {id, username} = req.user

    const lbdata = await Usergamedetails.find({death: {$gt: 0}})
    .populate({
        path: "owner",
        select: "username"
    })
    .limit(50)
    .sort({death: -1, updatedAt: -1})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the leaderboard`)
    })

    if (lbdata.length <= 0){
        const userStats = await getMatchStats(id);
        return res.json({message: "success", data: {
            leaderboard: {},
            userStats
        }})
    }

    // Get all user IDs including current user
    const userIds = lbdata.map(lb => lb.owner._id);
    if (!userIds.some(uid => uid.toString() === id.toString())) {
        userIds.push(new mongoose.Types.ObjectId(id));
    }

    // Batch fetch all stats at once
    const allStats = await getBatchMatchStats(userIds);
    const userStats = allStats.get(id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

    let tempindex = 0;
    const data = {
        leaderboard: {},
        userStats
    }

    lbdata.forEach(tempdata => {
        const {owner, death} = tempdata;
        const matchStats = allStats.get(owner._id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

        data.leaderboard[tempindex] = {
            user: owner.username,
            amount: death,
            totalWins: matchStats.totalWins,
            totalMatches: matchStats.totalMatches,
            playTime: matchStats.playTime
        };

        tempindex++;
    });

    return res.json({message: "success", data: data})
}

exports.getlevelleaderboard = async (req, res) =>{
    const {id, username} = req.user

    const lbdata = await Usergamedetails.find()
    .populate({
        path: "owner",
        select: "username"
    })
    .limit(50)
    .sort({level: -1})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting the leaderboard`)
    })

    if (lbdata.length <= 0){
        const userStats = await getMatchStats(id);
        return res.json({message: "success", data: {
            leaderboard: {},
            userStats
        }})
    }

    // Get all user IDs including current user
    const userIds = lbdata.map(lb => lb.owner._id);
    if (!userIds.some(uid => uid.toString() === id.toString())) {
        userIds.push(new mongoose.Types.ObjectId(id));
    }

    // Batch fetch all stats at once
    const allStats = await getBatchMatchStats(userIds);
    const userStats = allStats.get(id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

    let tempindex = 0;
    const data = {
        leaderboard: {},
        userStats
    }

    lbdata.forEach(tempdata => {
        const {owner, level} = tempdata;
        const matchStats = allStats.get(owner._id.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };

        data.leaderboard[tempindex] = {
            user: owner.username,
            amount: level,
            totalWins: matchStats.totalWins,
            totalMatches: matchStats.totalMatches,
            playTime: matchStats.playTime
        };

        tempindex++;
    });

    return res.json({message: "success", data: data})
}

exports.resetLeaderboard = async (req, res) => {
    const { id, username } = req.user;
    const { category, season } = req.body;

    if (!category || !season) {
        return res.status(400).json({ message: "bad-request", data: "Category and season are required." });
    }

    try {
        // Verify season exists
        const currentSeason = await Season.findById(season);
        if (!currentSeason) {
            return res.status(400).json({ message: "bad-request", data: "Invalid season ID." });
        }

        switch (category) {
            case "kill":
                await resetKillHistory(season);
                await Usergamedetails.updateMany({}, { $set: { kill: 0 } });
                break;
            case "death":
                await resetDeathHistory(season);
                await Usergamedetails.updateMany({}, { $set: { death: 0 } });
                break;
            case "level":
                await resetLevelHistory(season);
                await Usergamedetails.updateMany({}, { $set: { level: 1 } });
                break;
            case "amount":
                await resetAmountHistory(season);
                await Leaderboard.updateMany({}, { $set: { amount: 0 } });
                break;
            default:
                return res.status(400).json({ message: "bad-request", data: "Invalid category." });
        }

        return res.json({ 
            message: "success", 
            data: `${category} leaderboard reset successfully for season: ${currentSeason.title}` 
        });
    } catch (error) {
        console.log(`Error resetting leaderboard: ${error}`);
        return res.status(500).json({ message: "server-error", data: "There was an error resetting the leaderboard." });
    }
}


async function resetAmountHistory(season) {
    try {
        const lbdata = await Leaderboard.find({ amount: { $gt: 0 } })
            .populate({
                path: "owner",
                select: "username"
            })
            .sort({amount: -1, updatedAt: -1})
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem getting the leaderboard`)
                return [];
            });

            

        const currentSeason = await Season.findById(season);
        if (!currentSeason) {
            console.log(`No season found with ID: ${season}`);
            return;
        }

        if (lbdata.length > 0) {
            // Award titles to top 3 players for 'amount' category
            const top3 = lbdata.slice(0, 3);
            await awardLeaderboardTitles(top3, "amount");

            const leaderboardHistory = await LeaderboardHistory.findOne({ category: "amount" })
                .sort({ index: -1 })
                .then(data => data)
                .catch(err => {
                    console.log(`There's a problem getting the leaderboard history`)
                    return null;
                });

            const nextIndex = leaderboardHistory ? leaderboardHistory.index + 1 : 1;

            const historyEntries = lbdata.map((tempdata, position) => ({
                owner: tempdata.owner._id,
                category: "amount",
                amount: tempdata.amount,
                date: new Date().toISOString().split('T')[0],
                index: nextIndex,
                season: currentSeason._id,
                position: position + 1
            }));

            await LeaderboardHistory.insertMany(historyEntries);
        }
    } catch (error) {
        console.log(`Error resetting amount history: ${error}`);
    }
}

async function resetKillHistory(season) {
    try {
        const lbdata = await Usergamedetails.find({kill: {$gt: 0}})
            .populate({
                path: "owner",
                select: "username"
            })
            .sort({kill: -1, updatedAt: -1})
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem getting the kill leaderboard`)
                return [];
            });

        const currentSeason = await Season.findById(season);
        if (!currentSeason) {
            console.log(`No season found with ID: ${season}`);
            return;
        }

        if (lbdata.length > 0) {
            // Award titles to top 3 players for 'kill' category
            const top3 = lbdata.slice(0, 3);
            await awardLeaderboardTitles(top3, "kill");

            const leaderboardHistory = await LeaderboardHistory.findOne({ category: "kill" })
                .sort({ index: -1 })
                .then(data => data)
                .catch(err => {
                    console.log(`There's a problem getting the leaderboard history`)
                    return null;
                });

            const nextIndex = leaderboardHistory ? leaderboardHistory.index + 1 : 1;

            const historyEntries = lbdata.map((tempdata, position) => ({
                owner: tempdata.owner._id,
                category: "kill",
                amount: tempdata.kill,
                date: new Date().toISOString().split('T')[0],
                index: nextIndex,
                season: currentSeason._id,
                position: position + 1
            }));

            await LeaderboardHistory.insertMany(historyEntries);
        }
    } catch (error) {
        console.log(`Error resetting kill history: ${error}`);
    }
}

async function resetDeathHistory(season) {
    try {
        const lbdata = await Usergamedetails.find({death: {$gt: 0}})
            .populate({
                path: "owner",
                select: "username"
            })
            .sort({death: -1, updatedAt: -1})
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem getting the death leaderboard`)
                return [];
            });

        const currentSeason = await Season.findById(season);
        if (!currentSeason) {
            console.log(`No season found with ID: ${season}`);
            return;
        }

        if (lbdata.length > 0) {
            // Award titles to top 3 players for 'death' category
            const top3 = lbdata.slice(0, 3);
            await awardLeaderboardTitles(top3, "death");

            const leaderboardHistory = await LeaderboardHistory.findOne({ category: "death" })
                .sort({ index: -1 })
                .then(data => data)
                .catch(err => {
                    console.log(`There's a problem getting the leaderboard history`)
                    return null;
                });

            const nextIndex = leaderboardHistory ? leaderboardHistory.index + 1 : 1;

            const historyEntries = lbdata.map((tempdata, position) => ({
                owner: tempdata.owner._id,
                category: "death",
                amount: tempdata.death,
                date: new Date().toISOString().split('T')[0],
                index: nextIndex,
                season: currentSeason._id,
                position: position + 1
            }));

            await LeaderboardHistory.insertMany(historyEntries);
        }
    } catch (error) {
        console.log(`Error resetting death history: ${error}`);
    }
}

async function resetLevelHistory(season) {
    try {
        const lbdata = await Usergamedetails.find()
            .populate({
                path: "owner",
                select: "username"
            })
            .sort({level: -1})
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem getting the level leaderboard`)
                return [];
            });

        const currentSeason = await Season.findById(season);
        if (!currentSeason) {
            console.log(`No season found with ID: ${season}`);
            return;
        }

        if (lbdata.length > 0) {
            // Award titles to top 3 players for 'level' category
            const top3 = lbdata.slice(0, 3);
            await awardLeaderboardTitles(top3, "level");

            const leaderboardHistory = await LeaderboardHistory.findOne({ category: "level" })
                .sort({ index: -1 })
                .then(data => data)
                .catch(err => {
                    console.log(`There's a problem getting the leaderboard history`)
                    return null;
                });

            const nextIndex = leaderboardHistory ? leaderboardHistory.index + 1 : 1;

            const historyEntries = lbdata.map((tempdata, position) => ({
                owner: tempdata.owner._id,
                category: "level",
                amount: tempdata.level,
                date: new Date().toISOString().split('T')[0],
                index: nextIndex,
                season: currentSeason._id,
                position: position + 1
            }));

            await LeaderboardHistory.insertMany(historyEntries);
        }
    } catch (error) {
        console.log(`Error resetting level history: ${error}`);
    }
}

// Universal title award function for leaderboard categories
async function awardLeaderboardTitles(players, category) {
    try {
        const titleData = await Titles.findOne({ category: category });
        if (!titleData) {
            console.log(`No title data found for category: ${category}`);
            return;
        }
        const characterTitleData = players.map(player => ({
            owner: player.owner, // Use player.owner (ObjectId or populated doc)
            title: titleData._id,
            isEquipped: false,
        }));
        await CharacterTitles.insertMany(characterTitleData);
    } catch (error) {
        console.log(`Error awarding leaderboard titles: ${error}`);
    }
}

exports.getleaderboardhistory = async (req, res) => {
    try {
        const { index, category } = req.query; // Required filters now

        // Validate required params
        if (!index || !category) {
            return res.status(400).json({
                message: "bad-request",
                data: "Category and index are required."
            });
        }

        const idx = parseInt(index);
        if (Number.isNaN(idx)) {
            return res.status(400).json({
                message: "bad-request",
                data: "Index must be a number."
            });
        }

        // Fetch only the specified category + index group
        const historyData = await LeaderboardHistory.find({ index: idx, category })
            .populate({ path: "owner", select: "username" })
            .populate({ path: "season", select: "title" })
            .sort({ position: 1, amount: -1 }) // position ascending; fallback by amount desc
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem getting the leaderboard history: ${err}`);
                return res.status(500).json({
                    message: "error",
                    data: "There was a problem retrieving leaderboard history."
                });
            });

        if (!Array.isArray(historyData)) return; // early return if error response already sent

        if (historyData.length <= 0) {
            return res.json({
                message: "success",
                data: {
                    eventInfo: null,
                    leaderboard: []
                }
            });
        }

        // Build single event group details
        const first = historyData[0];
        const eventInfo = {
            category,
            index: idx,
            date: first.date,
            season: first.season ? first.season.title : "Unknown Season",
            totalParticipants: historyData.length
        };

        const leaderboard = historyData.map((entry, i) => ({
            user: entry.owner?.username,
            amount: entry.amount,
            position: entry.position || i + 1
        }));

        return res.json({
            message: "success",
            data: {
                eventInfo,
                leaderboard
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
        const { category } = req.query; // Optional category filter

        let matchStage = {};
        if (category) {
            matchStage.category = category;
        }

        // Get unique index values with their corresponding event details
        const historyOptions = await LeaderboardHistory.aggregate([
            {
                $match: {
                    category: category
                }
            },
            {
                $lookup: {
                    from: "seasons",
                    localField: "season",
                    foreignField: "_id",
                    as: "seasonInfo"
                }
            },
            {
                $group: {
                    _id: { index: "$index", category: "$category" },
                    date: { $first: "$date" },
                    index: { $first: "$index" },
                    category: { $first: "$category" },
                    season: { $first: { $arrayElemAt: ["$seasonInfo.title", 0] } }
                }
            },
            {
                $sort: { index: -1 } // Sort by index descending (newest first)
            },
            {
                $project: {
                    _id: 0,
                    index: "$index",
                    category: "$category",
                    name: {
                        $concat: [
                            "Reset #",
                            { $toString: "$index" },
                            " - ",
                            "$category",
                            " - ",
                            { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                            " (",
                            { $ifNull: ["$season", "Unknown"] },
                            ")"
                        ]
                    }
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





































// Deprecated updating to new leaderboard history system
// exports.resetleaderboard = async (req, res) => {
//     try {
//         // Get current leaderboard data before resetting
//         const currentLeaderboard = await Leaderboard.find({ amount: { $gt: 0 } })
//             .populate({
//                 path: "owner",
//                 select: "username"
//             })
//             .sort({ amount: -1, updatedAt: -1 })
//             .limit(1000)

//         if (currentLeaderboard.length > 0) {
//             // Find the next available index for this reset event
//             const latestHistory = await LeaderboardHistory.findOne()
//                 .sort({ index: -1 })
//                 .select('index');
//             const currentSeason = await Season.findOne({ status: "active" })
//             if (!currentSeason) {
//                 return res.status(400).json({
//                     message: "bad-request",
//                     data: "No active season found. Cannot reset leaderboard."
//                 });
//             }
//             const nextIndex = latestHistory ? latestHistory.index + 1 : 1;
            
//             // Create history entries for all users with scores > 0
//             const historyEntries = currentLeaderboard.map((entry, position) => ({
//                 owner: entry.owner._id,
//                 eventname: `${currentSeason.title} - Reset #${nextIndex}`,
//                 index: nextIndex,
//                 amount: entry.amount,
//                 date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
//             }));

//             // Save history entries
//             await LeaderboardHistory.insertMany(historyEntries);
//         }

//         // Reset the leaderboard
//         await Leaderboard.updateMany({}, { $set: { amount: 0 } });

//         return res.json({ message: "success" });
//     } catch (error) {
//         console.log(`Error resetting leaderboard: ${error}`);
//         return res.status(500).json({ 
//             message: "error", 
//             data: "There was a problem resetting the leaderboard. Please contact customer support." 
//         });
//     }
// }

// exports.getleaderboardhistory = async (req, res) => {
//     try {
//         const { index } = req.query; // Optional: get specific index, if not provided get all

//         let query = {};
//         if (index) {
//             query.index = parseInt(index);
//         }

//         const historyData = await LeaderboardHistory.find(query)
//             .populate({
//                 path: "owner",
//                 select: "username"
//             })
//             .sort({ index: -1, amount: -1 }) // Sort by index (newest first), then by amount (highest first)
//             .then(data => data)
//             .catch(err => {
//                 console.log(`There's a problem getting the leaderboard history: ${err}`);
//                 return res.status(500).json({
//                     message: "error", 
//                     data: "There was a problem retrieving leaderboard history."
//                 });
//             });

//         if (!historyData || historyData.length <= 0) {
//             return res.json({
//                 message: "success", 
//                 data: {
//                     history: {},
//                     totalEvents: 0
//                 }
//             });
//         }

//         // Group by index
//         const groupedHistory = {};
//         const eventDetails = {};

//         historyData.forEach(entry => {
//             const { index, owner, amount, eventname, date } = entry;
            
//             // Initialize the index group if it doesn't exist
//             if (!groupedHistory[index]) {
//                 groupedHistory[index] = [];
//                 eventDetails[index] = {
//                     eventname: eventname,
//                     date: date,
//                     totalParticipants: 0
//                 };
//             }

//             // Add user to the group
//             groupedHistory[index].push({
//                 user: owner.username,
//                 amount: amount,
//                 position: groupedHistory[index].length + 1
//             });

//             eventDetails[index].totalParticipants++;
//         });

//         // Format the response
//         const formattedHistory = {};
//         Object.keys(groupedHistory).forEach(index => {
//             formattedHistory[index] = {
//                 eventInfo: eventDetails[index],
//                 leaderboard: groupedHistory[index]
//             };
//         });

//         return res.json({
//             message: "success", 
//             data: {
//                 history: formattedHistory,
//                 totalEvents: Object.keys(formattedHistory).length
//             }
//         });

//     } catch (error) {
//         console.log(`Error getting leaderboard history: ${error}`);
//         return res.status(500).json({ 
//             message: "error", 
//             data: "There was a problem retrieving leaderboard history. Please contact customer support." 
//         });
//     }
// }
// Batch fetch match statistics for multiple users using aggregation pipeline
async function getBatchMatchStats(userIds) {
    try {
        // Aggregate match stats (total matches and wins) for all users at once
        const matchStats = await Matchhistory.aggregate([
            {
                $match: {
                    owner: { $in: userIds }
                }
            },
            {
                $group: {
                    _id: "$owner",
                    totalMatches: { $sum: 1 },
                    totalWins: {
                        $sum: {
                            $cond: [{ $eq: ["$placement", 1] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Get playTime from Usergamedetails for all users at once
        const gameDetails = await Usergamedetails.find(
            { owner: { $in: userIds } },
            { owner: 1, playTime: 1 }
        );

        // Create a Map for fast lookups
        const statsMap = new Map();

        // Initialize all users with default values
        userIds.forEach(userId => {
            statsMap.set(userId.toString(), {
                totalWins: 0,
                totalMatches: 0,
                playTime: 0
            });
        });

        // Populate match stats
        matchStats.forEach(stat => {
            const key = stat._id.toString();
            if (statsMap.has(key)) {
                statsMap.get(key).totalWins = stat.totalWins;
                statsMap.get(key).totalMatches = stat.totalMatches;
            }
        });

        // Populate playTime
        gameDetails.forEach(detail => {
            const key = detail.owner.toString();
            if (statsMap.has(key)) {
                statsMap.get(key).playTime = detail.playTime || 0;
            }
        });

        return statsMap;
    } catch (error) {
        console.log(`Error calculating batch match stats: ${error}`);
        // Return empty map on error
        const statsMap = new Map();
        userIds.forEach(userId => {
            statsMap.set(userId.toString(), {
                totalWins: 0,
                totalMatches: 0,
                playTime: 0
            });
        });
        return statsMap;
    }
}

// Helper function for single user (kept for backward compatibility if needed)
async function getMatchStats(userId) {
    const statsMap = await getBatchMatchStats([new mongoose.Types.ObjectId(userId)]);
    return statsMap.get(userId.toString()) || { totalWins: 0, totalMatches: 0, playTime: 0 };
}
// exports.getleaderboardhistoryoptions = async (req, res) => {
//     try {
//         // Get unique index values with their corresponding event details
//         const historyOptions = await LeaderboardHistory.aggregate([
//             {
//                 $group: {
//                     _id: "$index",
//                     eventname: { $first: "$eventname" },
//                     date: { $first: "$date" },
//                     index: { $first: "$index" }
//                 }
//             },
//             {
//                 $sort: { index: -1 } // Sort by index descending (newest first)
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     index: "$index",
//                     name: "$eventname",
//                 }
//             }
//         ]);

//         if (!historyOptions || historyOptions.length <= 0) {
//             return res.json({
//                 message: "success", 
//                 data: {
//                     options: [],
//                     totalOptions: 0
//                 }
//             });
//         }

//         return res.json({
//             message: "success", 
//             data: {
//                 options: historyOptions,
//                 totalOptions: historyOptions.length
//             }
//         });

//     } catch (error) {
//         console.log(`Error getting leaderboard history options: ${error}`);
//         return res.status(500).json({ 
//             message: "error", 
//             data: "There was a problem retrieving leaderboard history options. Please contact customer support." 
//         });
//     }
// }