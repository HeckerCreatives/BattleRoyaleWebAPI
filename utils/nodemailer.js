const nodemailer = require('nodemailer');
const Subscription = require('../models/Subscription');
const Investor = require('../models/Investor');
const fs = require('fs')
const path = require('path')

const privateKey = fs.readFileSync(path.resolve(__dirname, "../keys/node-key.pem"), 'utf-8');

exports.sendmailuser = async (html, subject) => {

    const transporter = nodemailer.createTransport({
        host: "mail.privateemail.com",
        port: 465,
        secure: true, // use TLS
        auth: {
          user: "support@rof.game",
          pass: "supportfearless$$",
        },
      dkim: {
          domainName: "rof.game",
          keySelector: "default",
          privateKey: privateKey,
        }, 
       });

    const fetchemailsubscribers = await Subscription.find({}).select('email')
    .then(data => data)
    .catch(err => {
        console.log(`Error finding email subscribers: ${err}`)
        return
    })

    if(fetchemailsubscribers.length <= 0){
        console.log("No email subscribers found")
        return
    }

    const emailsubscribers = fetchemailsubscribers.map(data => data.email)

    const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to: emailsubscribers,
        subject: subject,
        html: html
    }

    transporter.sendMail(mailOptions, function(err, info){
        if(err){
            console.log(`Error sending email: ${err}`)
            return
        }
        console.log(`Email sent: ${info.response}`)
    })
      
    
    return "success" 
 }

 
exports.sendmailinvestor = async (html, subject) => {

    const transporter = nodemailer.createTransport({
        host: "mail.privateemail.com",
        port: 465,
        secure: true, // use TLS
        auth: {
          user: "support@rof.game",
          pass: "supportfearless$$",
        },
      dkim: {
          domainName: "rof.game",
          keySelector: "default",
          privateKey: privateKey,
        }, 
       });

    const fetchemailsubscribers = await Investor.find({}).select('email')
    .then(data => data)
    .catch(err => {
        console.log(`Error finding email subscribers: ${err}`)
        return
    })

    if(fetchemailsubscribers.length <= 0){
        console.log("No email subscribers found")
        return
    }

    const emailsubscribers = fetchemailsubscribers.map(data => data.email)

    const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to: emailsubscribers,
        subject: subject,
        html: html
    }

    transporter.sendMail(mailOptions, function(err, info){
        if(err){
            console.log(`Error sending email: ${err}`)
            return
        }
        console.log(`Email sent: ${info.response}`)
    })
      
    
    return "success" 
 }