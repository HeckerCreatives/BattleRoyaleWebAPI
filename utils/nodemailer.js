const nodemailer = require('nodemailer');
const Subscription = require('../models/Subscription');
const Investor = require('../models/Investor');
const fs = require('fs')
const path = require('path')

const privateKey = fs.readFileSync(path.resolve(__dirname, "../keys/node-key.pem"), 'utf-8');

exports.sendmailuser = async (subject, message, banner) => {

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

    
    for (const email of emailsubscribers) {
        const htmlContent = this.getEmailTemplate(subject, message, banner, email);
        
        const mailOptions = {
            from: process.env.NODEMAILER_USER,
            to: email,
            subject: subject,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions).catch(err => {
            console.log(`Error sending email to ${email}: ${err}`);
        });
    }
    
    return "success" 
 }

 
 exports.sendmailinvestor = async (subject, message, banner) => {

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

       const fetchemailsubscribers = await Investor.find({})
       .select('email -_id')  // Add -_id to exclude the _id field
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


    for (const email of emailsubscribers) {
        const htmlContent = this.getEmailTemplate(subject, message, banner, email);
        
        const mailOptions = {
            from: process.env.NODEMAILER_USER,
            to: email,
            subject: subject,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions).catch(err => {
            console.log(`Error sending email to ${email}: ${err}`);
        });
    }
      
    
    return "success" 
 }

 exports.getEmailTemplate = (subject, message, banner, to_email) => {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rise of Fearless - Newsletter</title>
    <style type="text/css">
        /* Reset styles for email clients */
        body, p, h1, h2, h3, h4, h5, h6, table, td {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        
        body {
            background-color: #2C2C2C;
            color: #ffffff;
        }
        
        /* Ensure images don't exceed container width */
        img {
            max-width: 100%;
            display: block;
            border: 0;
        }
        
        /* Main container */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1a1a1a;
        }
        
        /* Content styling */
        .content {
         background-color: #2C2C2C;
            padding: 20px 30px;
        }
        
        .greeting {
            margin-bottom: 15px;
            font-size: 16px;
        }
        
        .headline {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            line-height: 1.3;
        }
        
        .body-text {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 20px;
        }
        
        .game-screenshot {
            margin: 20px 0;
            border: 1px solid #333;
        }
        
        .footer-content {
            background-color: #2C2C2C;
           
            font-size: 14px;
            text-align: center;
            color: #ffffff;
        }
        
        .footer-links {
            margin-top: 15px;
            text-align: center;
            font-size: 12px;
          
        }
        
        .footer-links a {
            color: #ff8c00;
            text-decoration: none;
            margin: 0 10px;
        }
        
        /* For Outlook and other email clients that don't support max-width */
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
            }
            
            .content {
                padding: 15px !important;
            }
        }
    </style>
</head>
<body>
    <!-- Email wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" class="email-container" style="max-width: 600px; background-color: #1a1a1a; color: #ffffff;">
        <!-- Header -->
        <tr>
            <td>
                <img src="https://res.cloudinary.com/dng6210h4/image/upload/v1741313705/Group_4_blycfj.png" alt="Rise of Fearless Header" width="600" style="width: 100%; max-width: 600px;">
            </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
            <td class="content" style="padding: 20px 30px;">
                <!-- Greeting -->
                <p class="greeting" style="margin-bottom: 15px; font-size: 16px; color: #E7E7E7;">Hello ${to_email},</p>
                
                <!-- Headline -->
                <h1 class="headline" style="font-size: 24px; font-weight: bold; margin-bottom: 20px; line-height: 1.3; color: #E7E7E7; ">${subject}</h1>
                
                <!-- Body Text -->
                <p class="body-text" style="font-size: 12px; line-height: 1.5; margin-bottom: 20px; color: #E7E7E7; white-space: pre-wrap;">
                ${message}
                </p>

              <img src={${process.env.LIVE_URL}/${banner}} alt="banner" width="100%" style="display: block; margin: 24 auto;">

                
               
                
               
            </td>
        </tr>
        
        <!-- Footer -->
     <tr>
    <td align="center" style="background-color: #2C2C2C;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="
            background: url('https://res.cloudinary.com/dng6210h4/image/upload/v1741313713/Group_5_q2byd3.png') no-repeat center top;
            background-size: cover;
            width: 100%;
            max-width: 600px;
        ">
            <tr>
                <td align="center" style="padding: 100px 20px 60px; text-align: center; color: white;">
                    <p style="margin: 0; font-size: 14px;">
                        © 2024 Rise of Fearless (rof.game). All rights reserved.
                    </p>
                    <p style="margin: 20px 0; font-size: 12px">
                        <a href="https://rof.game/newsletter?email={${to_email}}" style="color: #ff8c00; text-decoration: none; margin: 0 10px;">Unsubscribe</a> | 
                        <a href="https://rof.game/privacy" style="color: #ff8c00; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                    </p>
                </td>
            </tr>
        </table>

       
    </td>
</tr>



    </table>
</body>
</html>
    `;
}
