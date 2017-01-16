var Gpio = require('onoff').Gpio,
led = new Gpio(15, 'out'),
button = new Gpio(11, 'in', 'both');

button.watch(function (err, value) {
	console.log("watch value=", value);
  if (err) {
    throw err;
  }

  led.writeSync(value);
});

process.on('SIGINT', function () {
	console.log("SIGINT");
  led.unexport();
  button.unexport();
});