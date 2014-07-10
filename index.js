/**
 * Created by Akash on 10-07-2014.
 */
/**
 * Created by physics1 on 06-07-2014.
 */
var http = require('http');
var sql = require('mysql');
var mailer = require('nodemailer');


var config = JSON.parse(require('fs').readFileSync('./package.json'));

var connection = sql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database
});
connection.connect(function(err){
    console.log(err);
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
    software: "Default"
};

var server = http.createServer(function(req,res) {
    var body = "";
    console.log('connected');
    if(req.url == '/softwareName') {
        req.on('data', function (chunk) {
            body += chunk;
        });

        req.on('end', function (chunk) {
            var msg = JSON.parse(body);
            checkUser(msg, res);
        });
        res.writeHead(200, {'Content-Type': 'text/json'});
    }

    else if(req.url == '/register') {
        req.on('data', function (chunk) {
            body += chunk;
        });

        req.on('end', function (chunk) {
            var msg = JSON.parse(body);
            console.log("message",msg);
            check(msg, res);
        });

        res.writeHead(200, {'Content-Type': 'text/json'});
    }

});

//checkUser();
server.listen(config.port);
var found = 0;
function checkUser(msg,res) {
    var flag = 1;
    var queryKey = 'select passkey,software,used from keylist';
    var query = connection.query(queryKey,function (err,rows,fields) {
        //  console.log(rows[0].passkey);
        msg.password += '\u0000';
        rows.forEach(function (row) {

            if ((row.passkey == msg.password) &&(row.used == 0)) {
                msg.software = row.software;
                response.software = msg.software;
                response.code = 200;
                response.msg = "Key verified";
                res.end(JSON.stringify(response));
                flag = 0;
                //check(msg,res);
            }
        });
    });
    query.on('end', function () {
        if(flag == 1) {
            response.msg = "The key entered is incorrect";
            res.end(JSON.stringify(response));
        }
    });

}

function storeData(msg,res) {
    //connection.query('insert into ');
    var q = "UPDATE " + msg.software + " set bios = '" + msg.bios + "' WHERE actkey = '" +  msg.password + "\u0000'";
    console.log(q);
    var query = connection.query(q,function (err,rows,fields) {
        if(rows != null) {
            //console.log(msg.uname);
            response.code = 200;
            response.msg = 'Trial Activated';
            res.write(JSON.stringify(response));
            var mailOptions = {
                from: "ashakdwipeea@gmail.com",
                to: "User: " + msg.emailVerifier,
                subject: 'Software Activation',
                text: 'Hi there. Congrats ' +  msg.software + ' has been activated by ' + msg.username
            };

            var mailOptions2 = {
                from: "ashakdwipeea@gmail.com",
                to: msg.email,
                subject: 'Software Activation',
                text: 'Hi ' + msg.username + ' !! ' + msg.software + ' has been activated on your computer'
            };
            transport.sendMail(mailOptions,function(err,response) {
                if(err){
                    console.log(err);
                } else {
                    console.log('Message Sent' + response.message);
                }
            });

            transport.sendMail(mailOptions2,function(err,response) {
                if(err){
                    console.log(err);
                } else {
                    console.log('Message Sent' + response.message);
                }
            });

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
            var q3 = "insert into userlist values ('" + msg.username + "','" + msg.email + "','" + msg.emailVerifier + "','" + msg.phone + "','" + msg.address + "','" + msg.city + "','" + msg.country + "')";
            connection.query(q3, function (err, rows, fields) {
                if(err) {
                    console.log('Error' + err);
                }
            })
        })
    });

}



function check (msg,res) {
    connection.query('select actkey,email,bios,trial from ' + msg.software.toLowerCase(), function (err,rows,fields) {
        var flag_key = 0,
            flag_email = 0;
        console.log(msg.software);
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
                    response.trial = row.trial;
                    storeData(msg, res);
                    found = 1;
                } else {
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
        }
        if(found == 0) {
            if (flag_key == 2) {
                response.code = 401;
                response.msg = 'Incorrect Key';
                res.end(JSON.stringify(response));
            }
        }

    });
}