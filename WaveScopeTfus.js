// Theodore Brierre
// 15/10/2024
// Code to trigger Wave Generator and Scope of Digilent Analog discovery 3 with an external trigger source
// The generated wave is a pulse made with several cycles and hanning filtering
// This code launches a 'for' loop of 'numAcq' acquisitions that wait for external trigger before measuring and saving scope signal

clear();
if(!('Wavegen' in this) || !('Scope' in this)) throw "Please open a Scope and a Wavegen instrument";


// Create a new Date object to get the current date and time
var currentDate = new Date();

// Format the date as desired, for example: YYYY-MM-DD HH:MM:SS
var year = currentDate.getFullYear();
var month = ("0" + (currentDate.getMonth() + 1)).slice(-2);  // Months are 0-based
var day = ("0" + currentDate.getDate()).slice(-2);

// Combine into a readable date format
var formattedDate = year + "-" + month + "-" + day; 

// Save Path
var SavePath = "C:/Data/DataMaping/2D_Map_" + formattedDate + "-centering/";

// Trigger 1 wire on DI0 to read trigger value
StaticIO.Channel0.DIO0.Mode.text = "Input";  // Assume Trigger 1 is on DIO0

// Global Parameters
var fs = 100e6;               // Set Sampling frequency 
var Run_time = 5e-4;          // Set total run time
var samples = Math.round(fs * Run_time); // Number of samples
var nbAvg = 20;               // Number of signal acquired in 1 average

// Signal Parameters
var f = 500e3;                  // Frequency of the sine wave in Hz (e.g., 500 kHz)
var numCycles = 10;           // Number of cycles in the sine wave
var duration = numCycles / f; // Total duration based on the number of cycles
var samples_on = Math.round(fs * duration);  // Number of samples when signal 'on'

var t, sinePulse, hanningWindow;
var waveData = [];

// Generate the Hanning window and sinusoidal pulse
for (var i = 0; i < samples; i++) {
    if (i<samples_on){
        hanningWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / (samples_on - 1)));  // Hanning window
        t = i / fs;  // Time vector for the sine wave

        // Generate sine wave
        sinePulse = Math.sin(2 * Math.PI * f * t);  // Sinusoidal signal
    
        // Apply Hanning window to the sine wave
        waveData[i] = sinePulse * hanningWindow;  // Windowed sine wave: pulse signal
    }else{
        waveData[i] = 0;
    }
}
print(samples_on);
print(samples);


// Set Trigger window parameters
Wavegen1.Synchronization.text = "Synchronized";
Wavegen1.States.Trigger.text = "Trigger 1";     // Choose Trigger pin --> Trigger 1 <=> Digilen pin 'T1'
Wavegen1.States.Wait.value = 0.0;
Wavegen1.States.Run.value = Run_time;
Wavegen1.States.Repeat.value = "infinite";
Wavegen1.States.RepeatTrigger.checked = 1;     


// Set output waveform 
Wavegen1.Channel1.Mode.text = "Custom";        // Set channel 1 to custom mode
Wavegen1.Custom.set('test1',waveData);         // Set custom waveform data
Wavegen1.Channel1.Custom.Frequency.value = 1/Run_time; // Set pulse repetition frequency
Wavegen1.Channel1.Custom.Rate = fs;            // Set sample rate
Wavegen1.Channel1.Custom.Amplitude.value = 20e-3;  // Set signal amplitude
Wavegen1.Channel1.Custom.Offset.value = 0;     // Set Offset 


// Scope set up
//Scope.Time.checked = 1;          
Scope.Time.Samples.value = 16e3;              // Set number of samples
Scope.Time.Rate.value = 125e6;                // Set sample frequency

Scope.Channel2.checked = true;                // Set acquisition channel 2 'on'
Scope.Time.Mode.text = "Repeated";            // Acquisition mode
Scope.Trigger.Trigger.text = "Normal";        // Trigger mode
Scope.Trigger.Source.text = "Wavegen C1";     // Triggering source
Scope.Trigger.Condition.text = "Rising";      // Trigger condition
Scope.Trigger.Average.value = nbAvg;          // Set the number of signals for average
Scope.Time.Position.value = 50e-6;            // Set center position of scope view
Scope.Time.Base.value = 12e-5;                // Set the x-axis scale (s.div-1)

// Run Wavegen and Scope
Wavegen.run();
Scope.run();
StaticIO.run();

print("Hanning-windowed sine wave with " + numCycles + " cycles at " + f + " Hz is generated.");


// Acquire data

var numAcq = 90; // Number of positions in 3D grid 

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

// Send trigger to cnc to moove to next point

//StaticIO.Channel1.Mode.text = "IOs";           // Set channels 0 to 7 as binary outputs
//StaticIO.Channel0.Mode.text = "IOs";           // Set channels 8 to 15 as binary outputs

//StaticIO.Channel1.DIO15.Mode.text = "Button";  // Set channel 15 as a button (takes value 0 or 1)
//StaticIO.Channel1.DIO15.Button.text = "0/1";   // Set Button as '0 = origin state'

//StaticIO.run();                                
//StaticIO.Channel1.DIO15.value = 1;             // Set channel 15 to 1
//StaticIO.wait(0.5);                            // Trigger signal length = 0.5s
//StaticIO.Channel1.DIO15.value = 0;             // Set channel 15 to 0
//StaticIO.wait(0.1);                            // Wait before .stop() otherwise the output don't have the time to go to 0
//StaticIO.stop();                             


