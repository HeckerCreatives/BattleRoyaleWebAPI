const StaffUser = require("../models/Staffusers")
const Maintenance = require("../models/Maintenance")
const { default: mongoose } = require("mongoose")
const Sociallinks = require("../models/Sociallinks")


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
        const socialinksdata = ["facebook", "twitter(x)", "youtube", "discord", "telegram", "instagram", "linkedin", "tiktok", "reddit"]

        const socialinksbulkwrite = socialinksdata.map(titles => ({
            insertOne: {
                document: { title: titles, value: ""}
            }
        }))

        await Sociallinks.bulkWrite(socialinksbulkwrite)
        .catch(err => {
            console.log(`Error creating social links data: ${err}`)
            return
        }) 
    }

    console.log("SERVER DATA INITIALIZED")
}