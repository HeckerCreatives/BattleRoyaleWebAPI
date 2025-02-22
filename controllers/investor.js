const { default: mongoose } = require("mongoose");
const Investor = require("../models/Investor");




exports.subscribeinvestor = async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: "failed", data: "Incomplete input fields." });
    }

    const isExisting = await Investor.findOne({
        email: { $regex: `^${email}$`, $options: "i" } 
    });

    if (isExisting) {
        return res.status(400).json({ message: "failed", data: "Email already subscribed!" });
    }
    await Investor.create({
        name: name,
        email: email
    })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating investor subscription. Error: ${err}`)
        return res.status(400).json({ message: "failed", data: "There's a problem with the server! Please contact customer support for more details."})
    })

    return res.status(200).json({ message: "success" })
}

exports.getinvestorlist = async (req, res) => {

    const { page, limit, search } = req.query;

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }


    let query = {}

    if(search) {
        query = { $or: { email: { $regex: `^${search}$`, $options: "i" } }, name: { $regex: `^${search}$`, $options: "i" } }
    }

    const aggregationpipeline = [
        ...(search ? [ { $match: query }] : []),
        {
            $skip: pageOptions.page * pageOptions.limit
        },
        {
            $limit: pageOptions.limit
        },
        {
            $sort: { createdAt: -1 }
        }
    ]

    const investors = await Investor.aggregate(aggregationpipeline)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching investors. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const totaldocs = await Investor.countDocuments(query)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching total count of investors. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const data = []


    investors.forEach(temp => {
        data.push({
            id: temp._id,
            name: temp.name,
            email: temp.email,
            createdAt: temp.createdAt
        })
    })

    const finalpages = Math.ceil(totaldocs / pageOptions.limit)

    return res.status(200).json({ message: "success", data: data, totalpages: finalpages})
    
}

exports.deleteinvestor = async (req, res) => {

    const { id } = req.query;

    if(!id) {
        return res.status(400).json({ message: "failed", data: "Id is required." });
    }
 
    const investor = await Investor.findOne({ _id: new mongoose.Types.ObjectId(id) });

    if(!investor) {
        return res.status(404).json({ message: "failed", data: "Investor not found." });
    }

    await Investor.deleteOne({ _id: new mongoose.Types.ObjectId(id) })
    .then(() => {
        return res.status(200).json({ message: "success", data: "Investor deleted successfully." });
    })
    .catch(err => {
        console.log(`Error while deleting investor. Error: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    });

}


exports.getinvestors = async (req, res) => {
    const investors = await Investor.find()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching investors. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })
    const data = []
    investors.forEach(temp => {
        data.push({
            email: temp.email,
            name: temp.name
        })
    })

    return res.status(200).json({ message: "success", data: data})
}