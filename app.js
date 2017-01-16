/*
GPIO 10		decant_max
GPIO 11		osmosee_max
GPIO 12		eauneuve_max
GPIO 13		decant_min

GPIO 15		pompe_osmosee2decant
GPIO 16		electrovanne_osmosee
GPIO 17		pompe_eauneuve2decant
GPIO 18		pompe_decant2egout
*/

var ON  = 1;	//depends du relais
var OFF = 0;	//depends du relais
var LOW  = 0;
var HIGH = 1;

var LOG = 1;
var DEBUG = 0;
var TEST = 0;
var CHECK_PERIOD = 1;
var SERVER_PORT = 8987;

//Server & socket	npm install express	+ npm install http	+ npm install socket.io
var express = require('express');
app = express();
server = require('http').createServer(app);
io = require('socket.io').listen(server);
server.listen(SERVER_PORT);				//start server
app.use(express.static('public'));		//static page

//GPIO init
var Gpio = require('onoff').Gpio; 				// Constructor function for Gpio objects. (need npm install rpio & npm install onoff)

var decant_max 		= new Gpio(10, 'in', 'both');
var osmosee_max 	= new Gpio(11, 'in', 'both');
var eauneuve_max 	= new Gpio(12, 'in', 'both');
var decant_min		= new Gpio(13, 'in', 'both');
//var eauneuve_min	= new Gpio(14, 'in', 'both');

var pompe_osmosee2decant	= new Gpio(15, 'out');		pompe_osmosee2decant.writeSync(OFF);
var electrovanne_osmosee	= new Gpio(16, 'out');		electrovanne_osmosee.writeSync(OFF);
var pompe_eauneuve2decant 	= new Gpio(17, 'out');		pompe_eauneuve2decant.writeSync(OFF);
var pompe_decant2egout 		= new Gpio(18, 'out');		pompe_decant2egout.writeSync(OFF);
var pompe_osmosee2eauneuve	= new Gpio(19, 'out');		pompe_osmosee2eauneuve.writeSync(OFF);


//var changement_eau_bouton	= new Gpio(20, 'in');
var changement_eau = 0;

function manageWebInfos(socket) {
	infos_obj = {
		all: readGpioLog(),
		osmolation: { 
			pompe: pompe_osmosee2decant.readSync(), 
			capteur: decant_max.readSync() },
		osmosee_reserve: { 
			pompe: electrovanne_osmosee.readSync(), 
			capteur: osmosee_max.readSync() },
		eauneuve: { 
			pompe: pompe_osmosee2eauneuve.readSync(), 
			capteur: eauneuve_max.readSync() },
		changement_eau_vider:{ 
			pompe: pompe_decant2egout.readSync(), 
			capteur: decant_min.readSync() },
		changement_eau_remplir:{ 
			pompe: pompe_eauneuve2decant.readSync(),
			capteur: decant_max.readSync() }	
	};
	//io.sockets.emit( 'infos', {infos:readGpioLog()} );
	io.sockets.emit( 'infos', {infos:infos_obj} );
}

//manage changement d'eau sur bouton
function manageWebChangementEau(socket) {
	socket.on('changement_eau', function(data){
		if (LOG) { console.log("changement_eau VIDER !!!!!!!!!!"); }
	 	//on vide
		pompe_decant2egout.writeSync(ON);
		changement_eau = 1;
		decant_min.watch(function (err, value) {
			if (DEBUG) { console.log("decant_min=", value); }
		 	if (err) { throw err; }
			if (value==HIGH) { 
				pompe_decant2egout.writeSync(OFF);
				changement_eau_remplir();
			}
		});	
	});
	//io.sockets.emit('changement_eau', 1 );
}

//changement_eau_remplir
function changement_eau_remplir() {
	if (changement_eau==1) {	//protection
		if (LOG) { console.log("changement_eau REMPLIR !!!!!!!!!!"); }
		pompe_eauneuve2decant.writeSync(ON);
		decant_max.watch(function (err, value) {
			if (DEBUG) { console.log("decant_max=", value); }
		 	if (err) { throw err; }
			if (value==LOW && changement_eau==1) { 
				pompe_eauneuve2decant.writeSync(OFF);
				changement_eau = 0;
				pompe_osmosee2eauneuve.writeSync(ON);
			}
		});
	}
}

function readGpioLog() {
	var out = "";

	out += "--- changement_eau: " + changement_eau + " ---\n";

	out += "decant_max = " + 	decant_max.readSync() + "\n";
	out += "osmosee_max = " + 	osmosee_max.readSync() + "\n";
	out += "eauneuve_max = " + 	eauneuve_max.readSync() + "\n";
	out += "decant_min = " + 	decant_min.readSync() + "\n";
	//out += "eauneuve_min = " + eauneuve_min.readSync() + "\n";

	out += "pompe_osmosee2decant = " + 		pompe_osmosee2decant.readSync() + "\n";
	out += "electrovanne_osmosee = " + 		electrovanne_osmosee.readSync() + "\n";
	out += "pompe_eauneuve2decant = " + 	pompe_eauneuve2decant.readSync() + "\n";
	out += "pompe_decant2egout = " + 		pompe_decant2egout.readSync() + "\n";
	out += "pompe_osmosee2eauneuve = " +	pompe_osmosee2eauneuve.readSync() + "\n";

	if (LOG) console.log(out);
	return out;
}

//osmolation
decant_max.watch(function (err, value) {
	if (DEBUG) { console.log("decant_max=", value); }
 	if (err) { throw err; }
	if (changement_eau == 0) { 
		pompe_osmosee2decant.writeSync(value);
	}
});

//osmosee_reserve
osmosee_max.watch(function (err, value) {
	if (DEBUG) { console.log("osmosee_max=", value); }
 	if (err) { throw err; }
	electrovanne_osmosee.writeSync(value);
});

//eauneuve
eauneuve_max.watch(function (err, value) {
	if (DEBUG) { console.log("eauneuve=", value); }
 	if (err) { throw err; }
 	if (changement_eau == 0) { 
		pompe_osmosee2eauneuve.writeSync(value);
	}
});

//changement d'eau
/*
changement_eau_bouton.watch(function (err, value) {
	if (DEBUG) { console.log("changement_eau_bouton=", value); }
 	if (err) { throw err; }
 	//on vide
 	while (decant_min.readSync() == HIGH) {
 		pompe_decant2egout.writeSync(ON);
 	}
 	pompe_decant2egout.writeSync(OFF);
 	//on rempli
 	while (decant_max.readSync() == LOW) {
 		pompe_eauneuve2decant.writeSync(ON);
 	}
 	pompe_eauneuve2decant.writeSync(OFF);	
});
*/

if (TEST) {
	//test decant_min 
	decant_min.watch(function (err, value) {
		if (DEBUG) { console.log("decant_min=", value); }
	 	if (err) { throw err; }
		pompe_decant2egout.writeSync(value);
	});	
}

var check = function() {
	if (LOG) { console.log("Running every "+CHECK_PERIOD+" seconds"); }
	
	readGpioLog();
	manageWebInfos(io.sockets);

	//verif bug
	if (eauneuve_max.readSync()==LOW && pompe_osmosee2eauneuve.readSync()==ON) {
		if (LOG) { console.log("BUG eauneuve_max !!!!!!!!!!!!!!"); }
		pompe_osmosee2eauneuve.writeSync(OFF);
	}
	if (osmosee_max.readSync()==LOW && electrovanne_osmosee.readSync()==ON) {
		if (LOG) { console.log("BUG osmosee_max !!!!!!!!!!!!!!"); }
		electrovanne_osmosee.writeSync(OFF);
	}

	clearInterval( interval );				//reinit CHECK_PERIOD if modified
	interval = setInterval( check, CHECK_PERIOD * 1000);	
}

var interval = setInterval( check, CHECK_PERIOD * 1000);

//init (suite arret raspberry = check des niveaux)
pompe_osmosee2decant.writeSync( decant_max.readSync() );
electrovanne_osmosee.writeSync( osmosee_max.readSync() );
pompe_osmosee2eauneuve.writeSync( eauneuve_max.readSync() );

readGpioLog();


io.sockets.on('connection', function (socket) {
	if (DEBUG) { console.log('Socket connection'); }
	manageWebInfos(socket);
	manageWebChangementEau(socket);
});
if (LOG) { console.log("Running web on port ",SERVER_PORT); }
