const http = require('http');
const qs = require('querystring');
const fs = require('fs');
const path = require('path');
const url = require('url');
const async = require('async');
const mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID

const hostname = '127.0.0.1';
const port = 3000;

const fileRoot = path.join(__dirname, './public');

const mongoUrl = "mongodb://localhost:27017/";

// MongoClient.connect((mongoUrl + 'mydb'), function (err, db) {
//     if (err) throw err;
//     console.log("Database mydb created");
//     db.close();
// });

// MongoClient.connect(mongoUrl, function (err, db) {
//     if (err) throw err;
//     var dbo = db.db("mydb");
//     var customer = { firstName: "Customer", lastName: "ZZZ" };
//     dbo.createCollection("customers", function (err, result) {
//         if (err) throw err;
//         console.log("Collection 'customers' created");
//         dbo.collection("customers").insertOne(customer, function (err, result) {
//             if (err) throw err;
//             console.log("1 document inserted");
//             db.close();
//         });
//     });
// });

const server = http.createServer((req, res) => {

    const requrl = url.parse(req.url, true); // true = include querystring
    let body = '';
    
    switch (req.method) {
        case 'GET':
            switch (requrl.pathname) {
                case "/gettest":
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end(JSON.stringify(requrl.query, null, 2));
                    break;
                case "/web/customer":
                    getCustomersWeb(res);
                    break;
                case "/customer":
                    getCustomer(res, requrl.query.id);
                    break;
                case "/":
                    filePath = path.join(fileRoot, "index.html");
                    fs.readFile(filePath, function (err, fileData) {
                        if (err) {
                            send404(res);
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(fileData) });
                            res.end(fileData);
                        }
                    });
                    break;
                default:
                    send404(res);
            }
            break;
        case 'POST':
            switch (requrl.pathname) {
                case "/posttest":
                    req.on('data', function (data) {
                        body += data;
                    });
                    req.on('end', function () {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'text/plain');
                        res.end(JSON.stringify(body, null, 2));
                    });
                    break;
                case "/web/customer":
                    req.on('data', function (data) {
                        body += data;
                    });
                    req.on('end', function () {
                        const customer = qs.parse(body);
                        addCustomerWeb(res, customer);
                    });
                    break;
                case "/customer":
                    req.on('data', function (data) {
                        body += data;
                    });
                    req.on('end', function () {
                        const customer = JSON.parse(body);
                        addCustomer(res, customer);
                    });
                    break;
                default:
                    send404(res);
            }
            break;
        case 'DELETE':
            switch (requrl.pathname) {
                case "/customer":
                    deleteCustomer(res, requrl.query.id);
                    break;
                default:
                    send404(res);
            }
            break;
        case 'PUT':
            switch (requrl.pathname) {
                case "/customer":
                    req.on('data', function (data) {
                        body += data;
                    });
                    req.on('end', function () {
                        const customer = JSON.parse(body);
                        updateCustomer(res, customer);
                    });
                    break;
                default:
                    send404(res);
            }
            break;
        default:
            send404(res);
    }
});

server.on('error', function (err) {
    console.log('Server encountered error: ' + err.code);
    server.close(function () {
        console.log('Server has closed');
    });
    process.exit();
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

function send404(response) {
    console.log("404");
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.write('Error 404: Not Found');
    response.end();
}

function getCustomersWeb(res) {
    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("customers").find({}).toArray(function (err, result) {
            if (err) throw err;
            db.close();
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write(JSON.stringify(result, null, 2));
            res.end();
        });
    });
}

function addCustomerWeb(res, customer) {
    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("customers").insertOne(customer, function (err, result) {
            if (err) throw err;
            console.log("customer added");
            db.close();
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write('Customer added');
            res.end();
        });
    });
}

function getCustomer(res, id) {
    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) returnErrorResponse(res, err);
        var dbo = db.db("mydb");
        var query = (id !== undefined) ? { _id: new ObjectID(id) } : {}; //get one or all customers
        dbo.collection("customers").find(query).toArray(function (err, result) {
            if (err) returnErrorResponse(res, err);
            db.close();
            var jsonResult = JSON.stringify({ data: result });
            returnJsonResponse(res, jsonResult);
        });
    });
}

function addCustomer(res, customer) {
    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) returnErrorResponse(res, err);
        var dbo = db.db("mydb");
        dbo.collection("customers").insertOne(customer, function (err, result) {
            if (err) returnErrorResponse(res, err);
            db.close();
            var jsonResult = JSON.stringify({ data: result });
            returnJsonResponse(res, jsonResult);
        });
    });
}

function deleteCustomer(res, id) {
    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) returnErrorResponse(res, err);
        var dbo = db.db("mydb");
        var query = { _id: new ObjectID(id) };
        dbo.collection("customers").deleteOne(query, function (err, result) {
            if (err) returnErrorResponse(res, err);
            db.close();
            var jsonResult = JSON.stringify({ data: result });
            returnJsonResponse(res, jsonResult);
        });
    });
}

function updateCustomer(res, customer) {
    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) returnErrorResponse(res, err);
        var dbo = db.db("mydb");
        var query = {_id: new ObjectID(customer._id)};
        var newValues = { $set: {firstName: customer.firstName, lastName: customer.lastName } };
        dbo.collection("customers").updateOne(query, newValues, function (err, result) {
            if (err) returnErrorResponse(res, err);
            db.close();
            var jsonResult = JSON.stringify({ data: result });
            returnJsonResponse(res, jsonResult);
        });
    });
}

function returnJsonResponse(res, jsonData) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(jsonData);
    res.end();
}

function returnErrorResponse(res, err) {
    const error = JSON.stringify({ message: err.message, stack: err.stack });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.write(error);
    res.end();
}