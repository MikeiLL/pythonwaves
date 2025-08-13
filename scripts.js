import {choc, set_content, on, DOM} from "https://rosuav.github.io/choc/factory.js";
const { } = choc; //autoimport


let cutoff = null, cutoffTM = null;
const decay = document.getElementById("decay");
const thwaplength = document.getElementById("thwaplength");
const bandHz = document.getElementById("thwapfrequency").value;
// create web audio api context
const audioCtx = new AudioContext();

const sineboom = (e) => {
  let btn = e.match;
  if (cutoff) cutoff();
  btn.classList.add("playing");
  const gainNode = new GainNode(audioCtx);
  // create Oscillator node
  const oscillator = audioCtx.createOscillator();
  const biquadFilter = new BiquadFilterNode(audioCtx);
  let startTime = audioCtx.currentTime;
  biquadFilter.type = "peaking";
  biquadFilter.frequency.value = 440;
  biquadFilter.gain.value = 40;
  biquadFilter.frequency.setValueAtTime(110, startTime);
  biquadFilter.frequency.setTargetAtTime(1000, startTime, decay.value / 4);
  biquadFilter.frequency.setTargetAtTime(110, startTime, decay.value / 2);

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(110, startTime); // value in hertz

  oscillator.connect(gainNode).connect(biquadFilter).connect(audioCtx.destination);
  oscillator.start();
  oscillator.frequency.setTargetAtTime(20, startTime, 4);
  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.setTargetAtTime(0, startTime, decay.value / 2);
  cutoff = () => {
    oscillator.stop();
    btn.classList.remove("playing");
    clearTimeout(cutoffTM);
    cutoffTM = cutoff = null;
  }
  cutoffTM = setTimeout(cutoff, decay.value * 2000);
}



const noisethwap = (e) => {
  let btn = e.match;
  if (cutoff) cutoff();
  btn.classList.add("playing");
  const gainNode = new GainNode(audioCtx);
  // create Oscillator node
  const oscillator = audioCtx.createOscillator();
  const biquadFilter = new BiquadFilterNode(audioCtx);
  let startTime = audioCtx.currentTime;
  biquadFilter.type = "peaking";
  biquadFilter.frequency.value = 880;
  biquadFilter.gain.value = 40;
  biquadFilter.frequency.setValueAtTime(440, startTime);
  biquadFilter.frequency.setTargetAtTime(1000, startTime, thwapfrequency.value / 4);
  biquadFilter.frequency.setTargetAtTime(440, startTime, thwapfrequency.value / 2);

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(523, startTime); // value in hertz

  oscillator.connect(gainNode).connect(biquadFilter).connect(audioCtx.destination);
  oscillator.start();
  gainNode.gain.setValueAtTime(0.2, startTime);
  gainNode.gain.setTargetAtTime(0, startTime, thwapfrequency.value / 2);
  cutoff = () => {
    oscillator.stop();
    btn.classList.remove("playing");
    clearTimeout(cutoffTM);
    cutoffTM = cutoff = null;
  }
  cutoffTM = setTimeout(cutoff, decay.value * 2000);

  /* Lift from MDN step sequencer example */
  function playNoise() {
    const bufferSize = audioCtx.sampleRate * thwaplength.value; // set the time of the note

    // Create an empty buffer
    const noiseBuffer = new AudioBuffer({
      length: bufferSize,
      sampleRate: audioCtx.sampleRate,
    });

    // Fill the buffer with noise
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Create a buffer source for our created data
    const noise = new AudioBufferSourceNode(audioCtx, {
      buffer: noiseBuffer,
    });

    // Filter the output
    const bandpass = new BiquadFilterNode(audioCtx, {
      type: "bandpass",
      frequency: bandHz,
    });

    // Connect our graph
    noise.connect(bandpass).connect(audioCtx.destination);
    noise.start();
  }
  playNoise();
}

on("click", "#thwap", noisethwap);
on("click", "#boom", sineboom);
decay.addEventListener("change", (e) => DOM("#decayvalue").innerHTML = e.currentTarget.value);
thwaplength.addEventListener("change", (e) => DOM("#thwaplengthvalue").innerHTML = e.currentTarget.value);
