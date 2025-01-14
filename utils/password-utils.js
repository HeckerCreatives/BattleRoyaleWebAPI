
const bcrypt = require('bcrypt');



// There's already an existing utility for this haha wth am i doing
exports.comparePassword = async(oldPassword, inputPassword) => {
 try {
     return await bcrypt.compare(inputPassword, oldPassword);
 } catch (error) {
    console.error('Error comparing passwords:', error);
    throw new Error('Password comparison failed');}
}

exports.encrypt = async password => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}
