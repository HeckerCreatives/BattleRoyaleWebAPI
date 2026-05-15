const User = require("../models/Users");
const Userdetails = require("../models/Userdetails")
const Playercharactersettings = require("../models/Playercharactersettings")
const Wallets = require("../models/Wallets")
const { default: mongoose } = require("mongoose");

const { startOfISOWeek, endOfISOWeek, startOfYear, endOfYear } = require('date-fns');

const { daily, weekly, monthly, yearly } = require("../utils/graphfilter")
const { comparePassword, encrypt } = require("../utils/password-utils");


exports.registrationGraph = async (req, res) => {

    const { charttype } =  req.query
    const filter = charttype
    let projectCondition = {};
    let matchCondition = {};
    let groupCondition = {};
    let sortCondition = {};

    if (filter === 'daily') {
        const currentDate = new Date();
        const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(currentDate.setHours(24, 0, 0, 0));

        matchCondition = {
            createdAt: {
              $gte: startOfDay,
              $lt: endOfDay
            }
          }
        projectCondition = {
            hour_created: { $hour: "$createdAt" }
        };
        groupCondition = {
            _id: { hour: "$hour_created" },
            value: { $sum: 1 }
        }
        sortCondition = { "_id.hour": 1 };

    } else if (filter === 'weekly') {

        const currentDate = new Date();
        const startOfWeek = startOfISOWeek(currentDate);
        const endOfWeek = endOfISOWeek(currentDate);

        matchCondition = {
            createdAt: {
                $gte: startOfWeek,
                $lt: endOfWeek
            }
        };
        
        projectCondition = {
            day_of_week: { $dayOfWeek: "$createdAt" }
        };
        
        groupCondition = {
            _id: { day: "$day_of_week" },
            value: { $sum: 1 }
        };
        
        sortCondition = { "_id.day": 1 };

    } else if (filter === 'monthly') {
        const currentYear = new Date().getFullYear();

        const startOfCurrentYear = startOfYear(new Date(currentYear, 0, 1)); 
        const endOfCurrentYear = endOfYear(new Date(currentYear, 0, 1));

        matchCondition = {
            createdAt: {
                $gte: startOfCurrentYear, 
                $lt: endOfCurrentYear 
            }
        };
        projectCondition = {
            month: { 
                $month: "$createdAt" 
            },
        };
       groupCondition = {
            _id: {
                month: "$month"
            },
            value: { 
                $sum: 1 
            }
        };
        sortCondition = { "_id.month": 1 };

    } else if (filter === 'yearly') {    
        projectCondition = {
            year_created: {
                $year: "$createdAt"
            }
        }
        groupCondition = {
            _id: { 
                year: "$year_created"
            },
            value: { 
                $sum: 1 
            }
        };
        sortCondition = { "_id.year": 1 };
    } else {
        return res.status(400).json({ message: "failed", data: "Invalid filter. Use 'daily', 'weekly', 'monthly', or 'yearly'." });
    }

    const data = await User.aggregate([
        { $match: matchCondition },
        { $project: projectCondition },
        { $group: groupCondition },
        { $sort: sortCondition }
    ]);


    let finalData = {}

    // filtering data 
    if(filter === 'daily'){
        daily.forEach((time, index) => {
            const matchingEntry = data.find(entry => entry._id.hour === index + 1);
            
            finalData[time] = matchingEntry ? matchingEntry.value : 0;
        });
    } else if (filter === 'weekly'){
        weekly.forEach((weekday, index)=>{
            const matchingEntry = data.find(entry => entry._id.day === index + 1);

            finalData[weekday] = matchingEntry ? matchingEntry.value : 0;
        })
    } else if(filter === 'monthly'){
        monthly.forEach((month, index) => {
            const matchingEntry = data.find(entry => entry._id.month === index + 1);

            finalData[month] = matchingEntry ? matchingEntry.value : 0;
        })
    } else if(filter === 'yearly') {

        const releasedYear = 2024
        const currentYear = new Date("2030-11-08").getFullYear();

        for(let year = releasedYear; year <= currentYear; year++){
            const matchingEntry = data.find(entry => entry._id.year === parseInt(year, 10));

            finalData[year] = matchingEntry ? matchingEntry.value : 0;
        }
    } else {
        return res.status(400).json({ message: "failed", data: "Invalid filter. Use 'daily', 'weekly', 'monthly', or 'yearly'." });
    }

    
    return res.json({ message: "success", data: finalData});
}

exports.getRegistrationCount = async (req, res) => {

    const currentDate = new Date();
    const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(currentDate.setHours(24, 0, 0, 0));

    const totalTodayData = await User.aggregate([
        { 
            $match: {
            createdAt: {
                $gte: startOfDay,
                $lt: endOfDay
            }
        }
    },

        { 
            $group:{
            _id: null,
            value: { $sum: 1 }
        }
        },    
    ]);

    const totalRegistrationData = await User.aggregate([
        { 
            $group: {
            _id: null,
            value: { $sum: 1 }
        }
        },    
    ]);

    const data = {
        "totalusers": totalRegistrationData[0]?.value || 0,
        "usersToday": totalTodayData[0]?.value || 0,
    }



    return res.json({ message: "success", data: data});
  
}

exports.getPlayerList = async (req, res) => {

    const { page, limit, search, filter } = req.query;
 
    const pageOptions = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
    }

    let searchMatchStage = {};
    let filterMatchStage = {};

    if(search){
        searchMatchStage = {
            $or: [
                { username: search },
                { "details.email": search },
            ]
        };

    }

    if(filter === 'active' || filter === 'inactive'){
        filterMatchStage = {
            status: filter,
        }
    }

        const matchCondition = [
            {
                $lookup: {
                    from: "userdetails",
                    localField: "_id",
                    foreignField: "owner",
                    as: "details"
                }
            },
            {
                $unwind: {
                    path: "$details",
                }
            },
            ...(search ? [ { $match: searchMatchStage }] : []),
            ...(filter ? [ { $match: filterMatchStage }]: []),
            {
                $project: {
                    id: 1,
                    username: 1,
                    email: "$details.email",
                    country: "$details.country",
                    status: 1,
                    createdAt: 1
                }
            },
            {
                $skip: (pageOptions.page - 1) * pageOptions.limit
            },
            {
                $limit: pageOptions.limit 
            }
        ]

        const userdetails = await User.aggregate(matchCondition);

        const totalUsers = await User.countDocuments(matchCondition)
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while fetching users. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
        });

        const finalpages = Math.ceil(totalUsers / pageOptions.limit)

        const finaluserdata = []

        await userdetails.forEach(temp =>{
            const { _id, username, country, email, createdAt, status } = temp

                finaluserdata.push({
                    id: _id,
                    username: username,
                    status: status,
                    email: email,
                    country: country,
                    createdAt: createdAt
                })
        })
        const data = {
            "totalPages": finalpages,
            "userlist": finaluserdata,
        }


        return res.json({ message: "success", data: data});

}

exports.changeplayerpassword = async (req, res) => {
    const { userid, newpw } = req.body

    if(!userid || !newpw) {
        return res.status(400).json({ message: "failed", data: "Please enter all the details."})
    }
    
    if(newpw.length < 5 || newpw.length > 20) {
        return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 20 characters only for password! Please try again."})
    }

    const oldpw = await User.findOne({ _id: new mongoose.Types.ObjectId(userid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching for user ${id}. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
    })
    
    const isSamePassword = await comparePassword(oldpw.password, newpw)
    
    
    if(isSamePassword){
        return res.status(400).json({ message: "failed", data: "Please use another password" });
    }

    const encrypted = await encrypt(newpw)

    await User.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(userid)}, { $set: { password: encrypted }})
    .catch(err => {
        console.log(`There's a problem encountered while updating user ${userid}. Error: ${err}`)
        
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
    })
    return res.json({ message: "success"})
}

exports.banunbanuser = async (req, res) => {
    
    const { status, userid } = req.body
    
    if(!status || !userid){
        return res.status(400).json({ message: "failed", data: "Incomplete input fields"})
    }

    await User.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(userid)}, { $set: { status: status }})

    return res.status(200).json({ message: "success"})
}


exports.getUserDetails = async (req, res) => {
    const { id } = req.user

    const userData = await Userdetails.findOne({ owner: new mongoose.Types.ObjectId(id)})
    .populate({
        path: "owner",
        select: "username status gametoken webtoken walletAddress"
    })
    .lean()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching user data of ${id}. Error: ${err}`)
        
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    });

    const walletData = await Wallets.findOne({ owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching wallet of user ${id}. Error: ${err}`)
    })

    const userData11 = await Playercharactersettings.findOne({ owner: new mongoose.Types.ObjectId(id)})

    let finalData = {
        id: userData._id,
        username: userData.owner.username,
        email: userData.email,
        country: userData.country,
        profilepicture: userData.profilepicture,
        status: userData.owner.status,
        gametoken: userData.owner.gametoken,
        webtoken: userData.owner.webtoken,
        walletAddress: userData.owner.walletAddress
    }
    
    return res.status(200).json({ message: "success", data: finalData})
} 

exports.changeUserPassword = async (req, res) => {

    const { id } = req.user

    const { newPassword } = req.body

    if(newPassword.length < 5 || newPassword.length > 20) {
        return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 20 characters only for password! Please try again."})
    }

    const oldpw = await User.findOne({ _id: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching for user ${id}. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
    })
    
    const passwordRegex = /^[a-zA-Z0-9@\[\]]+$/;

    if(!passwordRegex.test(newPassword)){
        return res.status(400).json({ message: "failed", data: "Special characters in the password are not allowed. Only @, [, and ] are permitted." })
    }

    const isSamePassword = await comparePassword(oldpw.password, newPassword)
    
    
    if(isSamePassword){
        return res.status(400).json({ message: "failed", data: "Please use another password" });
    }

    const encrypted = await encrypt(newPassword)

    await User.findOneAndUpdate({ _id: id}, { $set: { password: encrypted }})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while changing user password for ${id}. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success" })
}

exports.updateUserProfile = async (req, res) => {
    const { id } = req.user
    const { email } = req.body

    if(!email) {
        return res.status(400).json({ message: "failed", data: "Please input email data."})
    }

    const isEmailExisting = await Userdetails.findOne({ 
    email: { $regex: `^${email}$`, $options: "i"}})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while searching for email: ${email} Error: ${err}`);    
    })

    if(isEmailExisting){
        return res.status(400).json({ message: "failed", data: "Email has already been used."})
    }

   await Userdetails.findOneAndUpdate({ owner: id }, { $set: { email: email }})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while updating user profile. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}