import {choc, set_content, on, DOM} from "https://rosuav.github.io/choc/factory.js";
const {INPUT, TD, TH} = choc; //autoimport
import {impulseResponse} from "./assets.js";

function copytext(copyme) {
	try {navigator.clipboard.writeText(copyme);} //TODO: What if this fails asynchronously?
	catch (exc) {
    //If we can't copy to clipboard, it might be possible to do it via an MLE.
    // (Multiline Entry Field which in HTML is TEXTAREA)
		const mle = TEXTAREA({value: copyme, style: "position: absolute; left: -99999999px"});
		document.body.append(mle);
		mle.select();
		try {document.execCommand("copy");}
		finally {mle.remove();}
	}
}

let cutoff = null, cutoffTM = null;
const decay = document.getElementById("decay");
const thwaplength = document.getElementById("thwaplength");
const bandHz = document.getElementById("thwapfrequency");
const stepCount = DOM("#stepCount");
const tempoSlider = DOM("#tempoSlider");
const rows = document.querySelectorAll("#sequencer tr");
const soundNames = ["boom", "thwap"];
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
  playBoom(audioCtx.currentTime, btn);
}

function playBoom(startTime, btn) {
  const oscillator = new OscillatorNode(audioCtx, {
    frequency: 110,
    type: "sine",
  });


  const gainNode = new GainNode(audioCtx);
  gainNode.gain.cancelScheduledValues(startTime);
  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.linearRampToValueAtTime(
    0,
    startTime + +decay.value
  );
  //oscillator.frequency.setTargetAtTime(0, startTime, startTime + +decay.value);
  //oscillator.frequency.setTargetAtTime(20, startTime + 0.12, +decay.value);

  oscillator.start(startTime);
  oscillator.stop(startTime + +decay.value);
  oscillator.connect(gainNode).connect(audioCtx.destination);
  if (btn) {
    cutoff = () => {
      //oscillator.stop();
      btn?.classList.remove("playing");
      clearTimeout(cutoffTM);
      cutoffTM = cutoff = null;
    }
    cutoffTM = setTimeout(cutoff, decay.value * 2000);
  }
}

const noisethwap = (e) => {
  let btn = e.match;
  btn.classList.add("playing");
  playNoise(audioCtx.currentTime);
}

// impulseResponse is defined in assets.js
// It's a base64 encoded string.
// Convert it to a binary array first
const reverbSoundArrayBuffer = base64ToArrayBuffer(impulseResponse);

const impulseBuffer = await audioCtx.decodeAudioData(reverbSoundArrayBuffer);

/* Lift from MDN step sequencer example */
function playNoise(startTime) {
  const gainNode = new GainNode(audioCtx);
  const reverbNode = audioCtx.createConvolver();
  const bufferSize = audioCtx.sampleRate * thwaplength.value; // set the time of the note
  reverbNode.buffer = impulseBuffer;
  // Create an empty buffer
  const noiseBuffer = new AudioBuffer({
    length: bufferSize,
    sampleRate: audioCtx.sampleRate,
  });

  // Create a buffer source for our created data
  const noise = new AudioBufferSourceNode(audioCtx, {
    buffer: noiseBuffer,
  });

  // Fill the buffer with noise
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  // Filter the output
  const bandpass = new BiquadFilterNode(audioCtx, {
    type: "bandpass",
    frequency: bandHz.value,
  });

  bandpass.frequency.linearRampToValueAtTime(
    bandHz.value / 2,
    startTime + +decay.value / 6
  );

  bandpass.frequency.linearRampToValueAtTime(
    100,
    startTime + +decay.value
  );

  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.setTargetAtTime(0, startTime, thwaplength.value / 2);
  // Connect our graph
  noise.connect(bandpass)/* .connect(reverbNode) */.connect(gainNode).connect(audioCtx.destination);
  noise.start(startTime);
}

function buildSteps() {
  document.querySelectorAll("#sequencer td").forEach(cell => cell.remove());
  for (let i = 0; i < stepCount.value; i++) {
    rows.forEach((row, r) => row.append(TD(INPUT({id: `stepaction-${r}-${i}`,type: "checkbox"}))));
  }
}

on("click", "#thwap", noisethwap);
on("click", "#boom", sineboom);
stepCount.onchange = buildSteps;
decay.addEventListener("input", (e) => DOM("#decayvalue").innerHTML = e.currentTarget.value);
thwaplength.addEventListener("input", (e) => DOM("#thwaplengthvalue").innerHTML = e.currentTarget.value);
thwapfrequency.addEventListener("input", (e) => DOM("#thwapfrequencyvalue").innerHTML = e.currentTarget.value);


on("click", "#togglePlay", (e) => {
  playing = !playing;
  set_content(e.match, playing ? "Stop ||" : "Play >")
  const bufferTime = 0.2;
  let stepTime = audioCtx.currentTime; // in seconds
  let currentStep = 0;
  function inqueue() {
    const stepDuration = 60 / tempoSlider.value;
    while (stepTime < audioCtx.currentTime + bufferTime * 2) {
      if (stepTime >= audioCtx.currentTime) {
        DOM(`#stepaction-0-${currentStep}`).checked && playBoom(stepTime);
        DOM(`#stepaction-1-${currentStep}`).checked && playNoise(stepTime);
      }
      if (++currentStep >= stepCount.value) currentStep = 0;
      stepTime += stepDuration;
    }

    // loop through a number of beats (step through columns)
    // if checked call corresponding function
    // loop a number of beats, know which beat we're on
    // and what time it happens
  }
  if (playing) {
    inqueue();
    timer = setInterval(inqueue, bufferTime * 1000);
  }
  else clearInterval(timer);
});

soundNames.forEach((sn, idx) => rows[idx].append(TH(sn)));
buildSteps();

on("click", "#copytoclipboard", () => {
  const settingsJSON = {};
  document.querySelectorAll("input.setting").forEach(s => settingsJSON[s.name] = s.type == "checkbox" ? s.checked : s.value);
  settingsJSON["pattern"] = {};
  rows.forEach((row, idx) => settingsJSON["pattern"][soundNames[idx]] = Array.from(row.querySelectorAll("input")).map(beat => beat.checked));
  copytext(JSON.stringify(settingsJSON));
});

on("click", "#loadsettings", () => {

});
