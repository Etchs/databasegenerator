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

var prompts = rl.createInterface(process.stdin, process.stdout);
function getValuesThenGenerateData(variable, max){
	prompts.question('Enter a number of '+variable+' from 1 to '+max+': ', function(num){
		if (isNaN(num)) {
		    console.log('This is not number, try again');
		    getValuesThenGenerateData(variable,max);
		}else if (variable=='devices') {
			numOfDevices = num;
			getValuesThenGenerateData('users',numOfDevices);
		}else if (variable=='users' && num>numOfDevices) {
			console.log('The number of user cannot exceed '+numOfDevices+' try again');
			getValuesThenGenerateData('users',numOfDevices);
		}else if(variable=='users'){
			numOfUsers = num;
			getValuesThenGenerateData('updates','positive infinity');
		}else if (variable=='updates') {
			numOfUpdates=num;
			console.log('numOfDevices= '+numOfDevices+' numOfUsers= '+numOfUsers+' numOfUpdates= '+numOfUpdates);
			generateData(numOfDevices,numOfUsers,numOfUpdates);
		}
	});
}

function generateData(numOfDevices,numOfUsers,numOfUpdates){
	var deviceStartTime = new Date(2014,9,17,6,33,30); // sets the start time of 'deviceTime' attribute in the updates collection
	var serverStartTime = new Date(2014,9,17,8,33,30); // sets the start time of 'serverTime' attribute in the updates collection
	
	var deviceIds = []; // an array to contain IMEI numbers for all devices
	for (var i = 0; i < numOfDevices; i++) {
		var deviceIMEI = '03588990502463' + ( i<10? '0'+i : i);
		deviceIds.push(deviceIMEI);
	}
	
	MongoClient.connect('mongodb://localhost:27017/iTrackEgypt', function(err, db) {
	    if(err) throw err;
	    db.dropDatabase();
	    
	    for (var i = 0; i < numOfDevices; i++) { // generate & insert a new device
	    	var device = {_id:deviceIds[i]};
	    	device.type = 'TR02';
	    	device.name = 'bus Num ' + i;
	    	device.simCard = '0100000000'+i;
	    	device.licensePlate = 'TRK00'+i;
	    	device.fuelConsumption100KM = 20;
	    	device.overspeed = 80;
	    	
	    	for (var j = 0; j < numOfUpdates; j++) { // generate & insert a new update for that device
	    		var update = {deviceIMEI:deviceIds[i]};
	    		update.updateType = 'gps';
	    		update.deviceTime = deviceStartTime.setSeconds(deviceStartTime.getSeconds() + j*30);
	    		update.serverTime = serverStartTime.setSeconds(serverStartTime.getSeconds() + j*30);
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
	    		}
			}
	    	
	    	db.collection('devices').insert(device, function(err, inserted) {
	            if(err) throw err;
	        });
		}
		
		var reminder = numOfDevices%numOfUsers;
		var start = 0;
		for (var k = 0; k < numOfUsers; k++) { // generate & insert a new user 
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
	        });
		}
	    
	});
}