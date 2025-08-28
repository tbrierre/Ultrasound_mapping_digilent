// Theodore Brierre
// 02/24/2025
// Code to monitor Tfus in MRI Scanner
// Sinus Wavegen

clear()
if(!('Wavegen' in this) || !('Scope' in this)) throw "Please open a Scope and a Wavegen instrument";


// Create a new Date object to get the current date and time
var currentDate = new Date();
// Format the date as desired, for example: YYYY-MM-DD HH:MM:SS
var year = currentDate.getFullYear();
var month = ("0" + (currentDate.getMonth() + 1)).slice(-2);  // Months are 0-based
var day = ("0" + currentDate.getDate()).slice(-2);
var formattedDate = year + "-" + month + "-" + day;  // Combine into a readable date format

// Save Path
var SavePath = "C:/Data/Test_Tfus_MRI/test_" + formattedDate + "/";


// Trigger 1 wire on DI0 to read trigger value
StaticIO.Channel0.DIO0.Mode.text = "Input";  // Assume Trigger 1 is on DIO0



///////////////////////////////////
//      Global Parameters             
//////////////////////////////////

var fs        = 1e7;          // Set Sampling frequency (Hz)
var Run_time  = 40e-3;        // Set total run time (s)
var nbAvg     = 0;            // Number of signal acquired in 1 average

// Tfus Parameters
var f         = 500e3;        // Frequency (Hz)
var amp       = 20e-3;       // Amplitude (V)
var phase     = 0;            // Phase (deg)
var delay     = 0e-6;         // Delay (s)

// Gate Parameters
var gate_time = Run_time;        // Gate time (s)
var gate_amp  = 5;            // Gate Amplitude (V)


///////////////////////////////////
//       Wavegen1: Tfus signal             
//////////////////////////////////


// Set Trigger parameters
Wavegen1.Synchronization.text = "Synchronized";  
Wavegen1.States.Trigger.text  = "Manual";     // Choose Trigger pin --> Trigger 1 <=> Digilen pin 'T1'
Wavegen1.States.Wait.value    = delay;           // wait for gate signal
Wavegen1.States.Run.value     = Run_time;        // Time Tfus 'on'
Wavegen1.States.Repeat.value  = "infinite";
Wavegen1.States.RepeatTrigger.checked = 1;     


// Set output waveform 
Wavegen1.Channel1.enable           = 1;           // Enable channel 1
Wavegen1.Channel1.Mode.text        = "Simple";    // Set channel 1 to simple mode
Wavegen1.Channel1.Simple.Type.text = "Sine";      // Set custom waveform data
Wavegen1.Channel1.Simple.Frequency.value = f;     // Set sinus frequency  (Hz)
Wavegen1.Channel1.Simple.Amplitude.value = amp;   // Set signal amplitude (V)
Wavegen1.Channel1.Simple.Offset.value    = 0;     // Set Offset 
Wavegen1.Channel1.Simple.Phase.value     = phase;
 

///////////////////////////////////
//       Wavegen2: GATE signal             
//////////////////////////////////

Wavegen2.Synchronization.text = "Synchronized";  
Wavegen2.States.Trigger.text  = "Manual";     // Choose Trigger pin --> Trigger 1 <=> Digilen pin 'T1'
Wavegen2.States.Wait.value    = 0.0;       // wait for gate signal
Wavegen2.States.Run.value     = Run_time;        // Time Tfus 'on'
Wavegen2.States.Repeat.value  = "infinite";
Wavegen2.States.RepeatTrigger.checked = 1;  

Wavegen2.Channel2.enable           = 1;           // Enable channel 2           
Wavegen2.Channel2.Mode.text        = "Simple";    // Set channel 2 to simple mode
Wavegen2.Channel2.Simple.Type.text = "DC";     // Set Gate channel as a pulse
//Wavegen2.Channel2.Simple.Frequency.value = round(1/(2*gate_time)); // Set Gate frequency (Hz)
//Wavegen2.Channel2.Simple.Amplitude.value = gate_amp;     // Set Gate amplitude (V)
Wavegen2.Channel2.Simple.Offset.value    = gate_amp; // Set Offset


///////////////////////////////////
//       Scope             
//////////////////////////////////

//Scope.Time.checked = 1;          
Scope.Time.Samples.value = 16e3;             // Set number of samples
Scope.Time.Rate.value    = 125e6;            // Set sample frequency

Scope.Channel1.checked       = true;         // Set acquisition channel 1 'on'
Scope.Channel2.checked       = true;         // Set acquisition channel 2 'on'
Scope.Time.Mode.text         = "Repeated";   // Acquisition mode
Scope.Trigger.Trigger.text   = "Normal";     // Trigger mode
Scope.Trigger.Source.text    = "Wavegen C2"; // Triggering source
Scope.Trigger.Condition.text = "Rising";     // Trigger condition
Scope.Trigger.Average.value  = nbAvg;        // Set the number of signals for average
Scope.Time.Position.value    = gate_time;    // Set center position of scope view
Scope.Time.Base.value        = 10*1/f;        // Set the x-axis scale (1e-1s.div-1)

//Scope.Channel1.Range.value   = 20*amp/5;      // Set Ch1 Range 
//Scope.Channel2.Range.value   = 20*gate_amp/5  // Set Ch2 Range


///////////////////////////////////
//    RUN WAVEGEN AND SCOPE             
//////////////////////////////////

Wavegen1.run();
Wavegen2.run();
Scope.run();
StaticIO.run();

print("Sine wave with" + amp + "V amp at " + f + " Hz is generated.");


// Acquire data

/*

var numAcq = 200; // Number of positions in 3D grid 

for (var i = 0; i < numAcq; i++){
    print("Data acquisition n" + String(i));

    // Pause until Wavegen is triggered
    while (StaticIO.Channel0.DIO0.Input.value < 1) {
        wait(0.001);  // Check the status every 1 ms to avoid heavy CPU usage
    }

    print("DI0 HIGH");

    Wavegen.States.Trigger.text = "None";
    Wavegen.States.Repeat.value = 1;
    for (var j = 0;j < nbAvg; j++){
        Wavegen.run();
        wait(0.1);  
    }

    // Reset Wavegen in trigger configuration
    Wavegen.stop();
    Wavegen.States.Trigger.text = "Trigger 1";
    Wavegen.States.Repeat.value = "infinite";
    Wavegen.run(); 

    // Collect scope data
    var data = Scope1.Channel2.data;

    // Capture time
    var dt = Scope1.Time.taken; // millisecond resolution
    dt = dt.toISOString();
    print("Time:", dt);

    // Export data
    Scope1.Export(SavePath + "data" + String(i) + ".csv","data");
    File(SavePath + "time" + String(i) + ".csv").write(dt);

    print("Acquisition done.");

    wait(0.2);
    Scope1.stop();
    wait(0.2);
    Scope1.run();
    }

Scope.stop();
Wavegen.stop();
StaticIO.stop();
                          

function generateSine(samples, samples_on, f, fs, alpha) {
    var waveData = new Array(samples);  // Initialize the array for waveform data

    for (var i = 0; i < samples; i++) {
        if (i < samples_on) {
            var t = i / fs;  // Time vector for the sine wave

            // Generate sine wave
            var sinePulse = Math.sin(2 * Math.PI * f * t);  // Sinusoidal signal

            // Apply Tukey window to the sine wave
            waveData[i] = sinePulse;  
        } else {
            waveData[i] = 0;  // Zero padding for the rest of the waveform
        }
    }

    return waveData;  // Return the generated wave data
}


*/