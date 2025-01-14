
const axios = require('axios');

exports.sendNewsletter = (recipientEmail, toName, title, content, ctaLink) => {
  const web = process.env.WEB || 'http://localhost:3000';

  axios.post('https://api.emailjs.com/api/v1.0/email/send', {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_USER_ID,
    template_params: {
      to_name: toName,
      to_email: recipientEmail,
      newsletter_title: title,
      newsletter_content: content,
      cta_link: ctaLink,
      unsubscribe_link: `${web}/unsubscribe`,
    },
  })
  .then((response) => {
    console.log('Newsletter sent successfully!', response.data);
  })
  .catch((error) => {
    console.error('Error sending newsletter:', error.response ? error.response.data : error.message);
  });
};
