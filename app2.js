var express = require('express');
var app = express();
var request = require('request');
var cors = require('cors');
var _ = require('lodash');
var config = require('./config');
var bodyParser = require('body-parser')

app.use(bodyParser.json());
app.use(cors());
// var mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/fitnessration');

// var db = mongoose.connection;

// var Order = mongoose.model('Order');

var MongoClient = require('mongodb').MongoClient,
	ObjectID = require('mongodb').ObjectID,
	assert = require('assert');

// Connection URL
var url = config.mongoUrl;
var db;
// Use connect method to connect to the server
MongoClient.connect(url, function(err, _db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  db = _db;
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/order-wizard', function (req, res) {
	var collections = ['meals', 'addOns', 'bundleTypes', 'portions', 'mealPlans', 'ingredients', 'sides', 'timeSlots', 'fulfillmentSettings', 'locationSurcharges', 'anomalyTriggers'];
	var data = {collections:{}}, count = 0;
	var num = collections.length;

	// data.excludedDates = [
	// 	['weekday', 5],
	// 	['weekday', 6],
	// 	['range', '2016-08-10', '2016-08-16'],
	// 	['dayOfYear', '10-29'],
	// 	['dayOfYear', '09-12']
	// ];

	var sorting = {
		bundleTypes: 'price',
	};

	function done() {
		if (++count == num) {
			for (var i = 0; i < data.collections.meals.length; ++ i) {
				var meal = data.collections.meals[i];
				meal.stock = mealStocksByMeal[meal._id] ? mealStocksByMeal[meal._id] : 0;
			}
			res.send(data);
		}
	}

	if (req.param('order')) {
		++num;
		db.collection('orders').findOne({_id:new ObjectID(req.param('order'))}, function(err, order) {
			data.order = order;
			done();
		});
	}

	var now = new Date();
	var today = now.getFullYear() + '-' + _.padStart(now.getMonth() + 1, 2, '0') + '-' + _.padStart(now.getDate(), 2, '0');

	var mealStocksByMeal = {};
	++num;

	request(config.adminUrl + 'api/stock', function(error, response, body) {
		mealStocksByMeal = JSON.parse(body);
		done();
	});
	// db.collection('mealStock').find({date:today}).toArray(function(err, documents) {
	// 	for (var i = 0; i < documents.length; ++ i) {
	// 		mealStocksByMeal[documents[i].meal] = documents[i];
	// 	}
	// 	done();
	// });

	for (var i = 0; i < collections.length; ++ i) {
		(function(i) {
			db.collection(collections[i]).find({}, {sort:sorting[collections[i]]}).toArray(function(err, documents) {
				if (collections[i] == 'fulfillmentSettings') {
					data.fulfillmentSettings = documents[0];
					delete data.fulfillmentSettings._id;
				}
				else {
					data.collections[collections[i]] = documents;
				}
				done();
			});		
		})(i);
	}
});

app.listen(3006);
