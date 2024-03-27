const Userdetails = require("../models/Userdetails")
const Users = require("../models/Users")
const { default: mongoose } = require("mongoose")
const bcrypt = require('bcrypt');

exports.getuserdetails = async (req, res) => {
    const {id, username} = req.user

    const details = await Userdetails.findOne({owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem getting user details for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your user details. Please contact customer support." })
    })

    if (!details){
        return res.status(400).json({ message: "bad-request", data: "There's a problem with your account! Please contact customer support." })
    }

    const data = {
        username: username,
        email: details.email,
        country: details.country,
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

exports.getplayerlist = async (req, res) => {
    const {id, username} = req.user
    const {page, limit} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    const userlistpipeline = [
        {
            $facet: {
                totalCount: [
                    {
                        $count: "total"
                    }
                ],
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
                    }
                ]
            }
        }
    ]

    const userlist = await Users.aggregate(userlistpipeline)
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting you user details. Please contact customer support." })
    })

    const data = {
        totalPages: Math.ceil(userlist[0].totalCount[0].total / pageOptions.limit),
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

exports.searchplayerbyusername = async (req, res) => {
    const {id, username} = req.user
    const {page, limit, status} = req.query
    const { search } = req.body

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
                            status: status,
                            username: {$regex: search}
                        }
                    }
                ],
                totalCount: [
                    {
                        $match: {
                            status: status,
                            username: {$regex: search}
                        }
                    },
                    {
                        $count: "total"
                    },
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
        totalPages: Math.ceil((userlist[0].totalCount[0] !== undefined? userlist[0].totalCount[0].total : 0) / pageOptions.limit),
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

exports.searchplayerbyemail = async (req, res) => {
    const {id, username} = req.user
    const {page, limit, status} = req.query
    const { search } = req.body

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
                            status: status,
                            email: {$regex: search}
                        }
                    }
                ],
            }
        }
    ]

    const countpipeline = [
        {
            $facet: {
                totalCount: [
                    {
                        $match: {
                            email: { $regex: search }
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

    const countlist = await Userdetails.aggregate(countpipeline)
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting you user details. Please contact customer support." })
    })

    const data = {
        totalPages: Math.ceil((countlist[0].totalCount[0] !== undefined ? countlist[0].totalCount[0].total : 0) / pageOptions.limit),
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