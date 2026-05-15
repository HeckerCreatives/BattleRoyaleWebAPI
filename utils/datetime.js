exports.getdaysago = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    const units = [
        { name: 'year', seconds: 31536000 },
        { name: 'month', seconds: 2592000 },
        { name: 'day', seconds: 86400 },
        { name: 'hour', seconds: 3600 },
        { name: 'minute', seconds: 60 },
        { name: 'second', seconds: 1 },
    ];

    for (let unit of units) {
        const interval = Math.floor(diffInSeconds / unit.seconds);
        if (interval >= 1) {
            return interval === 1 ? `${interval} ${unit.name} ago` : `${interval} ${unit.name}s ago`;
        }
    }

    return 'Just now';
}

exports.getdatetime = (timestamp) => {
    const past = new Date(timestamp);
    const months = [
        '01', '02', '03', '04', '05', '06',
        '07', '08', '09', '10', '11', '12'
    ];
    const days = [
        '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
        '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'
    ];

    const month = months[past.getMonth()];
    const day = days[past.getDate() - 1];
    const year = past.getFullYear();
    
    let hours = past.getHours();
    const minutes = past.getMinutes().toString().padStart(2, '0');
    const seconds = past.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strTime = hours.toString().padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + ampm;
    
    return month + '/' + day + '/' + year + ' ' + strTime;
}

exports.getsecondsuntilmidnight = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // midnight is 24:00 today

    const diffMs = midnight - now;
    const diffSeconds = Math.floor(diffMs / 1000);

    return diffSeconds;
}