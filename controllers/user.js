const Userdetails = require("../models/Userdetails")
const Users = require("../models/Users")
const Wallets = require("../models/Wallets")
const { default: mongoose } = require("mongoose")
const bcrypt = require('bcrypt');

//  #region PLAYER

exports.getuserdetails = async (req, res) => {
    const {id, username} = req.user

    const details = await Userdetails.findOne({owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem getting user details for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your user details. Please contact customer support." })
    })

    if (!details){
        return res.status(400).json({ message: "bad-request", data: "There's a problem with your account! Please contact customer support. Error Code: No user data" })
    }

    const walletdata = await Wallets.findOne({owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem with server. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server! Please try again later" })
    })

    if (!walletdata){
        return res.status(400).json({ message: "bad-request", data: "There's a problem with your account! Please contact customer support. Error Code: No wallet data" })
    }

    const data = {
        username: username,
        email: details.email,
        country: details.country,
        funds: walletdata.amount
    }

    return res.json({message: "success", data: data})
}

exports.changepassworduser = async (req, res) => {
    const {id, username} = req.user
    const {password} = req.body
    
    if (password == ""){
        return res.status(400).json({ message: "failed", data: "Please complete the form first before saving!" })
    }

    const hashPassword = bcrypt.hashSync(password, 10)

    await Users.findOneAndUpdate({_id: new mongoose.Types.ObjectId(id)}, {password: hashPassword})
    .catch(err => {

        console.log(`There's a problem changing password user for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem changing your password. Please contact customer support." })
    })

    return res.json({message: "success"})
}

exports.updateuserprofile = async (req, res) => {
    const {id, username} = req.user
    const { country, email } = req.body

    if (country == "" || email == ""){
        return res.status(400).json({ message: "bad-request", data: "Please complete the form before updating!." })
    }

    await Userdetails.findOneAndUpdate({owner: new mongoose.Types.ObjectId(id)}, { country: country, email: email,})
    .catch(err => {

        console.log(`There's a problem saving user details for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem updating your user details. Please contact customer support." })
    })

    return res.json({message: "success"})
}

//  #endregion

//  #region ADMIN

exports.getplayerlist = async (req, res) => {
    const {id, username} = req.user
    const {page, limit, search, filter} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    // Construct the search match stage
    let searchMatchStage = {};

    if (search) {
        searchMatchStage = {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { "userDetails.email": { $regex: search, $options: 'i' } }
            ]
        };
    }

    // Construct the filter match stage
    let filterMatchStage = {};

    if (filter) {
        if (filter === 'active' || filter === 'inactive') {
            filterMatchStage = { status: filter };
        }
    }


    const userlistpipeline = [
        {
            $lookup: {
                from: "userdetails", // Assuming the collection name for UserDetails is "userdetails"
                localField: "_id",
                foreignField: "owner",
                as: "userDetails"
            }
        },
        {
            $unwind: "$userDetails"
        },
        // Apply search match stage if search is provided and not empty
        ...(search ? [{ $match: searchMatchStage }] : []),
        // Apply filter match stage if filter is provided and not empty
        ...(filter ? [{ $match: filterMatchStage }] : []),
        {
            $facet: {
                totalCount: [
                    {
                        $count: "total"
                    }
                ],
                data: [
                    {
                        $project: {
                            username: 1,
                            email: "$userDetails.email",
                            country: "$userDetails.country",
                            createdAt: 1,
                            status: 1
                        }
                    },
                    {
                        $skip: pageOptions.page * pageOptions.limit
                    },
                    {
                        $limit: pageOptions.limit
                    }
                ]
            }
        }
    ];

    const userlist = await Users.aggregate(userlistpipeline)
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting you user details. Please contact customer support." })
    })

    const data = {
        totalPages: userlist[0].totalCount.length > 0 ? Math.ceil(userlist[0].totalCount[0].total / pageOptions.limit) : 0,
        userlist: []
    }


    userlist[0].data.forEach(value => {
        const {_id, username, status, createdAt, email, country} = value

        data["userlist"].push(
            {
                id: _id,
                username: username,
                email: email,
                country: country,
                status: status,
                createdAt: createdAt
            }
        )
    })

    return res.json({message: "success", data: data})
}

exports.banunbanuser = async (req, res) => {
    const {id, username} = req.user
    const {status, userid} = req.body

    await Users.findOneAndUpdate({_id: new mongoose.Types.ObjectId(userid)}, {status: status})
    .catch(err => {

        console.log(`There's a problem banning or unbanning user for ${username}, player: ${userid}, status: ${status} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your user details. Please contact customer support." })
    })

    return res.json({message: "success"})
}

exports.getplayercount = async (req, res) => {

    const totalplayer = await Users.countDocuments()
    .then(data => data)

    const activeplayer = await Users.countDocuments({status: 'active'})
    .then(data => data)

    const inactiveplayer = await Users.countDocuments({status: "inactive"})
    .then(data => data)

    const Counts = {
        "total": totalplayer,
        "active": activeplayer,
        "inactive": inactiveplayer
    }

    res.json({message: "success", data: Counts})
}

exports.getplayersbystatus = async(req, res) => {
    const {id, username} = req.user
    const {page, limit, status} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    const userlistpipeline = [
        {
            $facet: {
                
                data: [
                    {
                        $lookup: {
                            from: "userdetails", // Assuming the collection name for UserDetails is "userdetails"
                            localField: "_id",
                            foreignField: "owner",
                            as: "userDetails"
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            email: { $arrayElemAt: ["$userDetails.email", 0] },
                            country: { $arrayElemAt: ["$userDetails.country", 0] },
                            createdAt: 1,
                            status: 1
                        }
                    },
                    {
                        $skip: pageOptions.page * pageOptions.limit
                    },
                    {
                        $limit: pageOptions.limit
                    },
                    {
                        $match: {
                            status: status
                        }
                    }
                ],
                totalCount: [
                    {
                        $match: {
                            status: status
                        }
                    },
                    {
                        $count: "total"
                    }
                ],
            }
        }
    ]

    const userlist = await Users.aggregate(userlistpipeline)
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting you user details. Please contact customer support." })
    })

    const data = {
        totalPages: Math.ceil((userlist[0].totalCount[0]?.total !== undefined ? userlist[0].totalCount[0]?.total : 0) / pageOptions.limit),
        userlist: []
    }

    userlist[0].data.forEach(value => {
        const {_id, username, status, createdAt, email, country} = value

        data["userlist"].push(
            {
                id: _id,
                username: username,
                email: email,
                country: country,
                status: status,
                createdAt: createdAt
            }
        )
    })

    return res.json({message: "success", data: data})
}

exports.getregistrationcount = async (req, res) => {
    const {id, username} = req.user

    // Total number of users with a timestamp of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const totalUsers = await Users.countDocuments()
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting you user details. Please contact customer support." })
    })

    const usersToday = await Users.countDocuments({
        createdAt: {
            $gte: startOfDay,
            $lt: endOfDay
        }
    })
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting you user details. Please contact customer support." })
    })

    return res.json({message: "success", data: {
        totalusers: totalUsers,
        usersToday: usersToday
    }})
}

exports.getuserregistrationchart = async (req, res) => {
    const {id, username} = req.user
    const {charttype} = req.query

    if (charttype == "daily"){
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
    
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const hourlyCounts = await Users.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startOfDay,
                        $lt: endOfDay
                    }
                }
            },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const result = {};
        for (let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0') + ":00";
            result[hour] = 0;
        }

        hourlyCounts.forEach(item => {
            const hour = item._id.toString().padStart(2, '0') + ":00";
            result[hour] = item.count;
        });

        return res.json({message: "success", data: result})
    }
    else if (charttype == "weekly"){
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Aggregate user counts by day of the week
        const weeklyCounts = await Users.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startOfWeek,
                        $lt: endOfWeek
                    }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Format the result as desired
        const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const result = {};

        daysOfWeek.forEach(day => {
            result[day] = 0;
        });

        weeklyCounts.forEach(item => {
            const dayOfWeek = daysOfWeek[item._id - 1]; // MongoDB returns 1 for Sunday, 2 for Monday, etc.
            result[dayOfWeek] = item.count;
        });

        return res.json({message: "success", data: result});
    }
    else if (charttype == "monthly"){
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

        // Aggregate user counts by month
        const monthlyCounts = await Users.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startOfYear,
                        $lt: endOfYear
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Format the result as desired
        const months = [
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
        ];
        const result = {};

        months.forEach(month => {
            result[month] = 0;
        });

        monthlyCounts.forEach(item => {
            const monthName = months[item._id - 1]; // MongoDB returns 1 for January, 2 for February, etc.
            result[monthName] = item.count;
        });

        return res.json({message: "success", data: result});
    }
    else if (charttype == "yearly"){
        const releaseYear = 2024;
        const currentYear = new Date().getFullYear();

        // Aggregate user counts by year
        const yearlyCounts = await Users.aggregate([
            {
                $group: {
                    _id: { $year: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Format the result as desired
        const result = {};

        for (let year = releaseYear; year <= currentYear; year++) {
            result[year] = 0;
        }

        yearlyCounts.forEach(item => {
            const year = item._id;
            if (year >= releaseYear && year <= currentYear) {
                result[year] = item.count;
            }
        });
        
        return res.json({message: "success", data: result});
    }
}

exports.changepasswordforadmin = async (req, res) => {
    const {id, username} = req.user
    const {userid, oldpw, newpw} = req.body

    await Users.findOne({_id: new mongoose.Types.ObjectId(userid)})
    .then(async user => {
        if (user && (await user.matchPassword(oldpw))){
            const hashPassword = bcrypt.hashSync(newpw, 10)
            await Users.findOneAndUpdate({_id: new mongoose.Types.ObjectId(userid)}, {password: hashPassword})
            .catch(err => {
    
                console.log(`There's a problem getting users list for ${username} Error: ${err}`)
        
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server! Please contact customer support." })
            })
    
            return res.json({message: "success"})
        }
        else{
            return res.status(400).json({message: "failed", data: "Old password does not match!"})
        }
    })
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server! Please contact customer support." })
    })
}

//  #endregion