var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');

MongoClient.connect('mongodb://localhost:27017/itrackegypt', function(err, db) {
    if(err) throw err;
    
    var deviceStartTime = new Date(2014,9,17,6,33,30);
    var serverStartTime = new Date(2014,9,17,8,33,30);
    
    var input = fs.createReadStream('list.txt');
    
    var deviceIds = ['0358899050246380',
                     '0358899050246381',
                     '0358899050246382',
                     '0358899050246383',
                     '0358899050246384',
                     '0358899050246385',
                     '0358899050246386',
                     '0358899050246387',
                     '0358899050246388',
                     '0358899050246389'
                     ];    
    
    var locationsArray = [];
    var mileage = 0;
    
    var remaining = '';
	input.on('data', function(data) {
		remaining += data;
		var index = remaining.indexOf('\n');
		var last  = 0;
		while (index > -1) {
			var line = remaining.substring(last, index);
			last = index + 1;
			var arr = line.split(",");
			var lat = parseFloat(arr[0]);
			var long = parseFloat(arr[1]);
			var loc = {type: "Point", coordinates: [lat,long] };
			locationsArray.push(loc);
			index = remaining.indexOf('\n', last);
		}
		remaining = remaining.substring(last);
	});
	input.on('end', function() {
		if (remaining.length > 0) {
			var arr = remaining.split(",");
			var lat = parseFloat(arr[0]);
			var long = parseFloat(arr[1]);
			var loc = {type: "Point", coordinates: [lat,long] };
			
			
			for (var i = 0; i < deviceIds.length; i++) {
		    	var device = {_id:deviceIds[i]};
		    	device.type = 'TR02';
		    	device.name = 'bus Num ' + i;
		    	device.simCard = '0100000000'+i;
		    	device.licensePlate = 'TRK00'+i;
		    	device.fuelConsumption100KM = 20;
		    	device.overspeed = 80;
		    	device.totalMileage = 0;
		    	device.lastUpdateLocation = locationsArray[Math.floor(Math.random() * locationsArray.length)];
		    	
		    	
		    	db.collection('devices').insert(device, function(err, inserted) {
		            if(err) throw err;
		        });
		        
		    	
		    	for (var j = 0; j < 1000; j++) {
		    		var update = {deviceIMEI:deviceIds[i]};
		    		update.updateType = 'gps';
		    		update.deviceTime = deviceStartTime.setSeconds(deviceStartTime.getSeconds() + 30);
		    		update.serverTime = serverStartTime.setSeconds(serverStartTime.getSeconds() + 30);
		    		update.location =  locationsArray[j%locationsArray.length];
		    		update.speed = Math.floor((Math.random() * 100) + 1);
		    		update.direction = Math.floor(Math.random() * 360);
		    		mileage = mileage + 0.5;
		    		update.totalMileage = mileage;
		    		
		    		db.collection('updates').insert(update, function(err, inserted) {
			            if(err) throw err;
			        });
				}
			}
			
			var devicesGroups = [['0358899050246380','0358899050246381','0358899050246382'],
			                     ['0358899050246383','0358899050246384','0358899050246385'],
			                     ['0358899050246386','0358899050246387','0358899050246388','0358899050246389']];
			
			for (var k = 0; k < 3; k++) {
				var user = {username:"Ahmed"+k,
						accountType:"End User",
						timeZone: 1,
						devices:devicesGroups[k],
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
		}
	});
});
