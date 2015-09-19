/**
 * Created by Akash on 10-07-2014.
 */
/**
 * Created by physics1 on 06-07-2014.
 */
var http = require('http');
var sql = require('mysql');
var mailer = require('nodemailer');

var moment = require('moment');


var config = JSON.parse(require('fs').readFileSync('./package.json'));

var connection = sql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database
});
connection.connect(function(err){
    console.log("Error in connecting databae : " + err);
});

var transport = mailer.createTransport("SMTP",{
    service: "Mandrill",
    auth: {
        user: "ashakdwipeea@gmail.com",
        pass: "Dfhacm-zBJ6Jo4vcuFxzhA"
    }
});

var response = {
    code: 404,
    msg: "Default",
    bios: "Default",
    trial: 0,
    software: "Default",
    count: 0
};

var server = http.createServer(function(req,res) {

    console.log('connected');
    if(req.url == '/softwareName') {
        var body = "";
        req.on('data', function (chunk) {
            body += chunk;
        });

        req.on('end', function () {
            var msg = JSON.parse(body);
            console.log("Message from /softwareName is " , msg);
            checkUser(msg, res);
        });
        res.writeHead(200, {'Content-Type': 'text/json'});
    }

    else if(req.url == '/register') {
        var body1 = "";
        req.on('data', function (chunk) {
            body1 += chunk;
        });

        req.on('end', function () {
            var msg = JSON.parse(body1);
            console.log("message",msg);
            check(msg, res);
        });

        res.writeHead(200, {'Content-Type': 'text/json'});
    }

});

//checkUser(8000);
server.listen(8000);
var found = 0;
function checkUser(msg,res) {
    var flag = 1;
    var queryKey = 'select passkey,software,used,trial from keylist';
    var query = connection.query(queryKey,function (err,rows,fields) {
        //  console.log(rows[0].passkey);
        msg.password += '\u0000';

        if(!err) {
            rows.forEach(function (row) {
		console.log(row.passkey + ";" + row.used);
                console.log('Password ' + msg.password + ';');
                if ((row.passkey == msg.password) && (row.used == 0)) {
                    msg.software = row.software;
                    response.software = msg.software;
                    response.code = 200;
                    response.msg = "Key verified";
                    res.end(JSON.stringify(response));
                    flag = 0;
		    console.log("activatin first time");
                    //check(msg,res);
                } else if((row.passkey == msg.password) && (row.trial == 1)) {
                   msg.software = row.software;
                    response.software = msg.software;
                    response.code = 200;
		    console.log("Activating second time");
                    response.msg = "KEY FOUND.TRYING TO RESTORE DATA";
                    res.end(JSON.stringify(response));
                    flag = 0;
                }
            });
        } else {
            console.log("Error in querying software name " + err);
        }
    });
    query.on('end', function () {
        if(flag == 1) {
	    console.log("key entered is incorrev");
            response.code = 404;
            response.msg = "The key entered is incorrect";
            res.end(JSON.stringify(response));
        }
    });

}

function storeData(msg,res) {
    //connection.query(' ');
    var q = "UPDATE " + msg.software.toLowerCase() + " set bios = '" + msg.bios + "' WHERE actkey = '" +  msg.password + "\u0000'";
    console.log(q);
    var query = connection.query(q,function (err,rows,fields) {
        if(!err) {
            if (rows != null) {
                //console.log(msg.uname);
                response.code = 200;
                response.msg = 'Trial Activated';
                res.write(JSON.stringify(response));
                var mailOptions = {
                    from: "ashakdwipeea@gmail.com",
                    to: "User: " + msg.emailVerifier,
                    subject: 'Software Activation',
                    text: 'Hi there. Congrats ' + msg.software + ' has been activated by ' + msg.username
                };

                var mailOptions2 = {
                    from: "ashakdwipeea@gmail.com",
                    to: msg.email,
                    subject: 'Software Activation',
                    text: 'Hi ' + msg.username + ' !! ' + msg.software + ' has been activated on your computer'
                };
                transport.sendMail(mailOptions, function (err, response) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message Sent' + response.message);
                    }
                });

                transport.sendMail(mailOptions2, function (err, response) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message Sent' + response.message);
                    }
                });

            }
        } else {
            console.log("Error in writing bios" + err);
        }
    });

    query.on('end', function () {
        console.log('Till here response is availab;e', msg);
        msg.password += '\u0000';
        var q2 = "update keylist set Used = 1 where passkey ='" + msg.password + "'";
        var query2 = connection.query(q2, function (err, rows, fields) {
            if(err) {
                console.log(err);
                response.msg = 'Critical error occured. Contact software Developer immediately';
                res.end(JSON.stringify(response));
            } else {
                res.end();
            }
        });

        query2.on('end', function () {
            var q3 = "insert into userlist (Name,email,emailVerifier,phone,address,city,country,software, time) values ('" + msg.username + "','" + msg.email + "','" + msg.emailVerifier + "','" + msg.phone + "','" + msg.address + "','" + msg.city + "','" + msg.country + "','" +msg.software + "','" + moment().format('MMMM Do YYYY, h:mm:ss a') + "')";
            connection.query(q3, function (err, rows, fields) {
                if(err) {
                    console.log('Error' + err);
                }
            })
        })
    });

}



function check (msg,res) {
    connection.query('select actkey,email,bios,trial,count from ' + msg.software.toLowerCase(), function (err,rows,fields) {
        var flag_key = 0,
            flag_email = 0,
            trial = 0,
            count = 0;
        console.log("The software as recieved in check() " + msg.software);
        if(!err) {
            rows.forEach(function (row) {
                var str = row.actkey,
                    st = str.substr(0, str.length - 1),
                    str1 = msg.password;

                if (st.localeCompare(msg.password) == 0) {
                    flag_key = 3;

                    console.log(row.bios);
                    if (row.bios == null) {
                        //res.write(
                        // 'Credentials verified');
                        trial = row.trial;
                        count = row.count;
                        found = 1;
                    } else if(row.bios == msg.bios) {
                        trial = row.trial;
                        count = row.count;
                        found = 2;
                    }
                    else {
                        response.code = 402;
                        response.bios = row.bios;
                        response.msg = 'Using Duplicate Key';
                        res.end(JSON.stringify(response));
                    }

                } else if (row.actkey != msg.password) {
                    flag_key = 2;
                }
                if (row.email == msg.emailVerifier) {
                    flag_email = 1;
                }
            });


            if (flag_email == 0) {
                response.code = 401;
                response.msg = 'Username not registered';
                res.end(JSON.stringify(response));
            } else if(flag_email == 1 && found == 1) {
                response.trial = trial;
                response.count = count;
                if(trial == 1){
                    response.count = 4;
                }
                storeData(msg, res);
            } else if(flag_email == 1 && found == 2) {
                response.trial = trial;
                response.count = count;
                if(trial == 1){
                    response.count = 4;
                }

                response.code = 200;
                response.msg = 'Software Activated';
                res.end(JSON.stringify(response));
            }
            if (found == 0) {
                if (flag_key == 2) {
                    response.code = 401;
                    response.msg = 'Incorrect Key';
                    res.end(JSON.stringify(response));
                }
            }
        } else {
            console.log("There was a error in 2nd query " + err);
        }
    });

}
