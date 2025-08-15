import {choc, set_content, on, DOM} from "https://rosuav.github.io/choc/factory.js";
const {INPUT, TD, TH} = choc; //autoimport
import {impulseResponse} from "./assets.js";

let cutoff = null, cutoffTM = null;
const decay = document.getElementById("decay");
const thwaplength = document.getElementById("thwaplength");
const bandHz = document.getElementById("thwapfrequency");
const stepCount = DOM("#stepCount");
let playing;
let timer;

// http://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// create web audio api context
const audioCtx = new AudioContext();

const sineboom = (e) => {
  let btn = e.match;
  if (cutoff) cutoff();
  btn.classList.add("playing");
  playBoom(audioCtx.currentTime);
}

function playBoom(startTime) {
  const gainNode = new GainNode(audioCtx);
  // create Oscillator node
  const oscillator = audioCtx.createOscillator();
  const biquadFilter = new BiquadFilterNode(audioCtx);
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
  btn.classList.add("playing");
  playNoise(audioCtx.currentTime);
}

/* Lift from MDN step sequencer example */
function playNoise(startTime) {
  const gainNode = new GainNode(audioCtx);
  const bufferSize = audioCtx.sampleRate * thwaplength.value; // set the time of the note
  const reverbNode = audioCtx.createConvolver();
  // impulseResponse is defined in assets.js
  // It's a base64 encoded string.
  // Convert it to a binary array first
  const reverbSoundArrayBuffer = base64ToArrayBuffer(impulseResponse);

  audioCtx.decodeAudioData(
    reverbSoundArrayBuffer,
    (buffer) => {
      reverbNode.buffer = buffer;
    },
    (e) => {
      console.error("Error when decoding audio data", e.err);
    }
  );

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
    frequency: bandHz.value,
  });

  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.setTargetAtTime(0, startTime, decay.value / 2);
  // Connect our graph
  noise.connect(bandpass).connect(reverbNode).connect(gainNode).connect(audioCtx.destination);
  noise.start();
}

function buildSteps() {
  document.querySelectorAll("#sequencer td").forEach(cell => cell.remove());
  for (let i = 0; i < stepCount.value; i++) {
    rows.forEach(r => r.append(TD(INPUT({type: "checkbox"}))));
  }
}

on("click", "#thwap", noisethwap);
on("click", "#boom", sineboom);
stepCount.onchange = buildSteps;
decay.addEventListener("input", (e) => DOM("#decayvalue").innerHTML = e.currentTarget.value);
thwaplength.addEventListener("input", (e) => DOM("#thwaplengthvalue").innerHTML = e.currentTarget.value);
thwapfrequency.addEventListener("input", (e) => DOM("#thwapfrequencyvalue").innerHTML = e.currentTarget.value);
const rows = document.querySelectorAll("#sequencer tr");

on("click", "#togglePlay", () => {
  playing = !playing;
  function inqueue() {
    // loop through a number of beats (step through columns)
    // if checked call corresponding function
    // loop a number of beats, know which beat we're on
    // and what time it happens
  }
  if (playing) timer = setInterval(inqueue, 0.5);
  else clearInterval(timer);
});

rows[0].append(TH("thwap"));
rows[1].append(TH("boom"));
buildSteps();
