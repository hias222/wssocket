global.fetch = require("node-fetch");

const sendHeat = (jsondaata) => {
    console.log("sendheat to api/heat/add")
    let responsedata = "OK"

    console.log(JSON.stringify(jsondaata))

    fetch('http://localhost:3000/api/heat/add', {
        method: 'POST', // or 'PUT'
        headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        cache: 'no-cache',
        body: JSON.stringify(jsondaata)
    })
        .then(response => {
            responsedata = response;
            return response
        })
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
            console.log('jsondaata: ');
            console.log(JSON.stringify(jsondaata))
            console.log('responsedata: ');
            console.log(responsedata)
        });
}

exports.sendHeat = sendHeat;