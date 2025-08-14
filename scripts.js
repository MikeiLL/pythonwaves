import {choc, set_content, on, DOM} from "https://rosuav.github.io/choc/factory.js";
const { } = choc; //autoimport
import {impulseResponse} from "./assets.js";

let cutoff = null, cutoffTM = null;
const decay = document.getElementById("decay");
const thwaplength = document.getElementById("thwaplength");
const bandHz = document.getElementById("thwapfrequency");

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
  let startTime = audioCtx.currentTime;

  /* Lift from MDN step sequencer example */
  function playNoise() {
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
  playNoise();
}

on("click", "#thwap", noisethwap);
on("click", "#boom", sineboom);
decay.addEventListener("input", (e) => DOM("#decayvalue").innerHTML = e.currentTarget.value);
thwaplength.addEventListener("input", (e) => DOM("#thwaplengthvalue").innerHTML = e.currentTarget.value);
thwapfrequency.addEventListener("input", (e) => DOM("#thwapfrequencyvalue").innerHTML = e.currentTarget.value);
