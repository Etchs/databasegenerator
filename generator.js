var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');
var rl = require('readline');

var input = fs.createReadStream('list.txt'); // Reads a list of latitudes and longitudes
var locationsArray = []; // Array to hold a list of latitudes and longitudes
var remaining = '';
input.on('data', function(data) {
	remaining += data;
	var index = remaining.indexOf('\n');
	var last  = 0;
	while (index > -1) {
		var line = remaining.substring(last, index);
		last = index + 1;
		var arr = line.split(",");
		var loc = {type: "Point", coordinates: [parseFloat(arr[0]),parseFloat(arr[1])] };
		locationsArray.push(loc);
		index = remaining.indexOf('\n', last);
	}
	remaining = remaining.substring(last);
});

input.on('end', function() {
	if (remaining.length > 0) {
		var arr = remaining.split(",");
		var loc = {type: "Point", coordinates: [parseFloat(arr[0]),parseFloat(arr[1])] };
		locationsArray.push(loc);
	    var numOfDevices = 30; // any integer from 1 to 99 [30 is default value]
	    var numOfUsers = 10; // any integer from 1 to numOfDevices [10 is default value]
	    var numOfUpdates = 1000; // any integer representing the number of updates stored for each device [1000 is default value]
	    getValuesThenGenerateData('devices',99);
	    //generateData(numOfDevices,numOfUsers,numOfUpdates);
	}
});


function generateGeofences(){
	var geofences = [
	                    {
	                    	name: 'geofence1',
	                    	polygon: {
	                    		type: 'Polygon',
	                    		coordinates: [[ [30.07135,31.29188],
	                    		                [30.06889,31.29023],
	                    		                [30.06829,31.29352],
	                    		                [30.07019,31.29426],
	                    		                [30.07135,31.29188] ]]
	                    	},
	                    	remark: 'remark 1',
	                    	lastUpdateGeofenceFlag: false
	                    },
	                    {
	                    	name: 'geofence2',
	                    	polygon: {
	                    		type: 'Polygon',
	                    		coordinates: [[ [30.07966,31.30513],
	                    		                [30.07272,31.30775],
	                    		                [30.07606,31.31732],
	                    		                [30.08249,31.32076],
	                    		                [30.08349,31.31243],
	                    		                [30.07966,31.30513] ]]
	                    	},
	                    	remark: 'remark 2',
	                    	lastUpdateGeofenceFlag: false
	                    },
	                    {
	                    	name: 'geofence3',
	                    	polygon: {
	                    		type: 'Polygon',
	                    		coordinates: [[ [30.08742,31.32084],
	                    		                [30.08341,31.32672],
	                    		                [30.08471,31.33513],
	                    		                [30.0901,31.3405],
	                    		                [30.0953,31.33887],
	                    		                [30.09344,31.32801],
	                    		                [30.08742,31.32084] ]]
	                    	},
	                    	remark: 'remark 3',
	                    	lastUpdateGeofenceFlag: false
	                    }
	                 ];
	             
	return geofences;
}

function generateData(numOfDevices,numOfUsers,numOfUpdates){
	var deviceIds = []; // an array to contain IMEI numbers for all devices
	for (var i = 0; i < numOfDevices; i++) {
		var deviceIMEI = '03588990502463' + ( i<10? '0'+i : i);
		deviceIds.push(deviceIMEI);
	}
	
	MongoClient.connect('mongodb://localhost:27017/iTrackEgypt', function(err, db) {
	    if(err) throw err;
	    db.dropDatabase();
	    
	    var noOfDevicesInserted = 0;
	    for (var i = 0; i < numOfDevices; i++) { // generate & insert a new device
	    	var device = {_id:deviceIds[i]};
	    	device.type = 'TR02';
	    	device.name = 'bus Num ' + i;
	    	device.simCard = '0100000000'+i;
	    	device.licensePlate = 'TRK00'+i;
	    	device.fuelConsumption100KM = 20;
	    	device.overspeed = 80;
	    	device.geofences = generateGeofences();
	    	device.totalMileage = 0.0;
	    	device.offlineFlag = true;
	    	//device.stopDetailTimerFlag = false;
	    	device.geofenceAlarmsArraySize = 0;
	    	
	    	for (var j = 0; j < numOfUpdates; j++) { // generate & insert a new update for that device
	    		var update = {deviceIMEI:deviceIds[i]};
	    		update.updateType = 'gps';
	    		var deviceTime = new Date('2014-09-17T06:00:00.000Z'); // sets the start time of 'deviceTime' attribute in the updates collection
	    		var serverTime = new Date('2014-09-17T08:00:00.000Z'); // sets the start time of 'serverTime' attribute in the updates collection	    		
	    		deviceTime.setSeconds(j*30);
	    		serverTime.setSeconds(j*30);
	    		update.deviceTime = deviceTime;
	    		update.serverTime = serverTime;
	    		update.location =  locationsArray[j%locationsArray.length];
	    		update.speed = Math.floor((Math.random() * 100) + 1);
	    		update.direction = Math.floor(Math.random() * 360);
	    		update.totalMileage = j*0.5;
	    		
	    		db.collection('updates').insert(update, function(err, inserted) {
		            if(err) throw err;
		        });
	    		
	    		if(j == (numOfUpdates-1)){ // last update for this device
	    			device.lastUpdateLocation = update.location;
	    			device.totalMileage = update.totalMileage;
	    			device.lastUpdateSpeed = update.speed;
	    			device.lastUpdateDirection = update.direction;
	    		}
			}
	    	
	    	db.collection('devices').insert(device, function(err, inserted) {
	            if(err) throw err;
	            noOfDevicesInserted++;
	            if(noOfDevicesInserted == numOfDevices){ // last device was successfully inserted
		    		var reminder = numOfDevices%numOfUsers;
		    		var start = 0;
		    		for (var k = 0; k < numOfUsers; k++) { // generate & insert a new user 
		    			var numOfDevicesUpdatedWithUsers = 0;
		    			var end =  start + Math.floor(numOfDevices/numOfUsers);
		    			if(reminder>0){
		    				end += 1;
		    				reminder--;
		    			}
		    			var userDevices =  deviceIds.slice(start,end);
		    			start = end;
		    			var user = {username:"Ahmed"+k,
		    					accountType:"End User",
		    					timeZone:k,
		    					devices:userDevices,
		    					firstName:"Ahmed"+k,
		    					lastName:"Mohamed"+k,
		    					password:"password"+k,
		    					email:"email"+k,
		    					address:"address"+k,
		    					city:"city"+k,
		    					country:"country"+k,
		    					telMob:"0100000000"+k,
		    					accountVerification: true
		    					};
		    			db.collection('users').insert(user, function(err, inserted) {
		    	            if(err) throw err;
		    	            
		    	            for (var n = 0; n < inserted[0].devices.length; n++) {
								var deviceIMEI = inserted[0].devices[n];
								
								var query = {_id:deviceIMEI};
		    	            	
		    	            	var newUser = {
    	            					'user_id': inserted[0]._id,
    	            					'userName': inserted[0].username,
    	            					'userActivation': new Date('2014-09-10T06:00:00.000Z'),
    	            					'userExpiration': new Date('2016-09-10T06:00:00.000Z')
    	            				};
		    	            	var operator = {
		    	            			'$push': {
		    	            				'users': newUser
		    	            			}
		    	            		};
		    	            	db.collection('devices').update(query, operator, function(err, updated) {
		    	                    if(err) throw err;
		    	                    numOfDevicesUpdatedWithUsers++;
		    	                    if (numOfDevicesUpdatedWithUsers == numOfDevices){
		    	                    	db.stats({scale:1024},function(err, dbStats) {
		    	                			var statistics={
		    	                					'db name':dbStats.db,
		    	                					'no of indexes' : dbStats.indexes,
		    	                					'no of collections': dbStats.collections,
		    	                					'no of objects in db': dbStats.objects,
		    	                					'size of data held in the db (datasize)': dbStats.dataSize + ' Kilobytes (including the padding factor)',
		    	                					'document average size' : dbStats.avgObjSize + ' bytes (The datasize divided by the no of documents)',
		    	                					'storage size': dbStats.storageSize + ' Kilobytes (total space allocated to collections in database for document storage)',
		    	                					'indexes size': dbStats.indexSize + ' Kilobytes (The total size of all indexes created on this database)',
		    	                					'size of data files that hold the database': dbStats.fileSize +' Kilobytes ( includes preallocated space and the padding factor)',
		    	                					'size of the namespace files (i.e. that end with .ns)': dbStats.nsSizeMB+' Megabytes'
		    	                			};
		    	                			console.dir(statistics);
		    	                			db.close();
		    	                			process.exit();
		    	                		});
		    	                    }
		    	                });
								
							}
		    	        });
		    		}
	            }
	        });
	    	
	    	
		}
		
		
		console.log('Finished the creation of '+numOfDevices+' devices for '+numOfUsers+' users and '+numOfUpdates+' update per device');
	});
}

var prompts = rl.createInterface(process.stdin, process.stdout);
function getValuesThenGenerateData(variable, max){
	prompts.question('Enter a number of '+variable+' from 1 to '+max+': ', function(num){
		if (isNaN(parseInt(num))) {
		    console.log('This is not number, try again');
		    getValuesThenGenerateData(variable,max);
		}else if (variable=='devices' && parseInt(num)>99) {
			console.log('The number of devices cannot exceed 99, try again');
			getValuesThenGenerateData('devices',99);
		}else if (variable=='devices') {
			numOfDevices = parseInt(num);
			getValuesThenGenerateData('users',numOfDevices);
		}else if (variable=='users' && parseInt(num)>numOfDevices) {
			console.log('The number of users cannot exceed '+numOfDevices+' try again');
			getValuesThenGenerateData('users',numOfDevices);
		}else if(variable=='users'){
			numOfUsers = parseInt(num);
			getValuesThenGenerateData('updates','positive infinity');
		}else if (variable=='updates') {
			numOfUpdates = parseInt(num);
			console.log('Creating numOfDevices= '+numOfDevices+' numOfUsers= '+numOfUsers+' numOfUpdates= '+numOfUpdates+' Please wait...');
			generateData(numOfDevices,numOfUsers,numOfUpdates);
		}
	});
}
