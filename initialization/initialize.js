const StaffUser = require("../models/Staffusers")
const Maintenance = require("../models/Maintenance")
const { default: mongoose } = require("mongoose")
const Sociallinks = require("../models/Sociallinks")
const Version = require("../models/Version")
const Marketplace = require("../models/Marketplace")
const {Titles} = require("../models/Titles")
const {marketdata, titlesdata, questdata} = require("./data")
const { Quest } = require("../models/Quest")


exports.initialize = async () => {

    const admin = await StaffUser.find({ auth: "superadmin"})
    .then(data => data)
    .catch(err => {
        console.log(`Error finding the admin data: ${err}`)
        return
    })

    if(admin.length <= 0 ){
        await StaffUser.create({ username: "battleroyaleadmin", password: "fxFWO2gY31R7", webtoken: "", status: "active", auth: "superadmin"})
        .catch(err => {
            console.log(`Error saving admin data: ${err}`)
            return
        }) 
    }

    const version = await Version.find({});

    if (version.length <= 0) {
        await Version.create({
            version: "1.0.0",
            description: "Initial version of the game",
            releaseDate: new Date(),
            isActive: true
            });
        console.log("Version initialized");
    }

    const maintenanceList = await Maintenance.find()
    .then(data => data)
    .catch(err => {
        console.log(`Error finding maintenance data: ${err}`)
    })

    if (maintenanceList.length <= 0) {
        const maintenanceListData = ["ingame", "fullgame"];
        const maintenanceBulkWrite = maintenanceListData.map(maintenanceData => ({
            insertOne: {
                document: { type: maintenanceData, value: "0" }
            }
        }));


        await Maintenance.bulkWrite(maintenanceBulkWrite)
        .catch(err => {
            console.log(`Error creating maintenance data: ${err}`)
            return
        }) 
    }

    const sociallinks = await Sociallinks.find()
    .then(data => data)
    .catch(err => {
        console.log(`Error finding Social Links data: ${err}`)
    })


    if(sociallinks.length <= 0){
        const socialinksdata = [
            { title: "telegram", link: "", type: "user" },
            { title: "instagram", link: "", type: "user" },
            { title: "x", link: "", type: "user" },
        ]

        const socialinksbulkwrite = socialinksdata.map(data => ({
            insertOne: {
                document: { 
                    title: data.title, 
                    link: data.link,
                    type: data.type
                }
            }
        }))

        await Sociallinks.bulkWrite(socialinksbulkwrite)
        .catch(err => {
            console.log(`Error creating social links data: ${err}`)
            return
        }) 
    }

    const marketitems = await Marketplace.find()
    .then(data => data)
    .catch(err => {
        console.log(`Error finding marketplace items: ${err}`)
    })


    if (marketitems.length <= 0) {
        await Marketplace.insertMany(marketdata)
        .catch(err => {
            console.log(`Error creating marketplace items: ${err}`)
            return
        })
        console.log("Marketplace items initialized");
    }
    

    const titles = await Titles.find()
    .then(data => data)
    .catch(err => {
        console.log(`Error finding titles: ${err}`)
    })

    if (titles.length <= 0) {
        await Titles.insertMany(titlesdata)
        .catch(err => {
            console.log(`Error creating titles: ${err}`)
            return
        })
        console.log("Titles initialized");
    }

    const questCount = await Quest.countDocuments()

    if (questCount <= 0) {
        await Quest.insertMany(questdata)
        console.log(`Quests initialized`);
    }

    console.log("SERVER DATA INITIALIZED")
}