import {choc, set_content, on, DOM} from "https://rosuav.github.io/choc/factory.js";
const {INPUT, TD, TH} = choc; //autoimport
import {impulseResponse} from "./assets.js";

let cutoff = null, cutoffTM = null;
const boomLength = document.getElementById("boomlength");
const thwapLength = document.getElementById("thwaplength");
const thwapFrequency = document.getElementById("thwapfrequency");
const beepLength = document.getElementById("beeplength");
const beepFrequency = document.getElementById("beepfrequency");
const beepDamp = document.getElementById("beepdamper");
const stepCount = DOM("#stepcount");
const tempoSlider = DOM("#tempo");
const swingSlider = DOM("#swing");
const modulationFrequencySlider = DOM("#modulationfrequency");
const modulationAmountSlider = DOM("#modulationamount");
const rows = document.querySelectorAll("#sequencer tr");
const soundNames = ["beep", "thwap", "boom"];
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
    startTime + +boomLength.value
  );

  oscillator.frequency.linearRampToValueAtTime(40, startTime + +boomLength.value * 2);
  oscillator.start(startTime);
  oscillator.stop(startTime + +boomLength.value);
  oscillator.connect(gainNode).connect(audioCtx.destination);
  if (btn) {
    cutoff = () => {
      btn?.classList.remove("playing");
      clearTimeout(cutoffTM);
      cutoffTM = cutoff = null;
    }
    cutoffTM = setTimeout(cutoff, boomLength.value * 2000);
  }
}

const beepit = (e) => {
  let btn = e.match;
  btn.classList.add("playing");
  playBeep(audioCtx.currentTime);
}

/*
modulation:
 range of values max
 modulationAmountSlider.value determines size of range
 modulationFrequencySlider.value determines step size (multiplied by resolution)
*/
const modShapes = {
  "square": [50, -50],
  // "random":  [50, -50] (Math.random() < 0.5 ? modWaves.square[0] : modWaves.square[1])
};

function playBeep(startTime, btn) {
  const oscillator = new OscillatorNode(audioCtx, {
    frequency: +beepFrequency.value + (Math.floor(audioCtx.currentTime) % 2 ? modShapes.square[0] : modShapes.square[1]),
    type: "sawtooth",
  });
  const gainNode = new GainNode(audioCtx);
  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.setTargetAtTime(0, startTime, +beepLength.value);
  // Filter the output
  const bandpass = new BiquadFilterNode(audioCtx, {
    type: "lowpass",
    frequency: beepFrequency.value,
  });

  bandpass.frequency.linearRampToValueAtTime(
    beepDamp.value,
    startTime + +beepLength.value
  );

  oscillator.start(startTime);
  oscillator.stop(startTime + +beepLength.value);
  oscillator.connect(bandpass).connect(gainNode).connect(audioCtx.destination);
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
  const bufferSize = audioCtx.sampleRate * thwapLength.value; // set the time of the note
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
    type: "lowpass",
    frequency: thwapFrequency.value,
  })

  bandpass.frequency.linearRampToValueAtTime(
    100,
    startTime + +boomlength.value
  );

  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.setTargetAtTime(0, startTime, thwapLength.value / 2);
  // Connect our graph
  noise.connect(bandpass)/* .connect(reverbNode) */.connect(gainNode).connect(audioCtx.destination);
  noise.start(startTime);
}

function buildSteps() {
  document.querySelectorAll("#sequencer td").forEach(cell => cell.remove());
  for (let i = 0; i < stepCount.value; i++) {
    rows.forEach((row, r) => row.append(TD(INPUT({id: `stepaction-${r}-${i}`,type: "checkbox", checked: (1 + r + i) % 2}))));
  }
}

on("click", "#thwap", noisethwap);
on("click", "#boom", sineboom);
on("click", "#beep", beepit);
stepCount.onchange = buildSteps;
boomLength.addEventListener("input", (e) => DOM("#boomlengthvalue").innerHTML = e.currentTarget.value);
thwapLength.addEventListener("input", (e) => DOM("#thwaplengthvalue").innerHTML = e.currentTarget.value);
thwapFrequency.addEventListener("input", (e) => DOM("#thwapfrequencyvalue").innerHTML = e.currentTarget.value);
beepLength.addEventListener("input", (e) => DOM("#beeplengthvalue").innerHTML = e.currentTarget.value);
beepFrequency.addEventListener("input", (e) => DOM("#beepfrequencyvalue").innerHTML = e.currentTarget.value);
beepDamp.addEventListener("input", (e) => DOM("#beepdampervalue").innerHTML = e.currentTarget.value);
modulationFrequencySlider.addEventListener("input", (e) => DOM("#modulationfrequencyvalue").innerHTML = e.currentTarget.value);
modulationAmountSlider.addEventListener("input", (e) => DOM("#modulationamountvalue").innerHTML = e.currentTarget.value);

/* Convert a pattern of true/false values to a string of octal digits
Every three values, from the left, is assigned a digit. An incomplete
set of three will be padded with zeroes at the right. */
function to_octal(pattern) {
  let ret = "";
  for (let i = 0; i < pattern.length; i += 3) {
  ret += (pattern[i] ? 4 : 0) + (pattern[i+1] ? 2 : 0) + (pattern[i+2] ? 1 : 0);
  }
  return ret;
}

function shareable(settings) {
  const slug = [];
  slug.push("C" + settings.stepcount);
  slug.push("T" + settings.tempo);
  slug.push("S" + settings.swing);
  //Boom settings
  slug.push("B" + settings.boomlength);
  //Thwap settings
  slug.push("X" + settings.thwaplength);
  slug.push("X" + settings.thwapfrequency);
  //Beep settings
  slug.push("P" + settings.beeplength);
  slug.push("P" + settings.beepfrequency);
  slug.push("P" + settings.beepdamper);
  slug.push("P" + settings.modulationfrequency);
  slug.push("P" + settings.modulationamount);
  //And the pattern.
  slug.push("b" + to_octal(settings.pattern.boom));
  slug.push("x" + to_octal(settings.pattern.thwap));
  slug.push("p" + to_octal(settings.pattern.beep));
  return slug.join("");
}

function load(slug) {
  //The slug consists of a series of numbers, prefixed with a single letter.
  //Some letters may be duplicated and will be interpreted in sequence within
  //the duplicate set, but otherwise all values are order-independent.
  // eg: C4T120S0B0.4X0.25X7500P0.5P4000P200b52x25p52
  const keys = {
    "C": ["stepcount"],
    "T": ["tempo"],
    "S": ["swing"],
    "B": ["boomlength"],
    "X": ["thwaplength", "thwapfrequency"],
    "P": ["beeplength", "beepfrequency", "beepdamper", "modulationfrequency", "modulationamount"],
    "b": ["pattern_boom"],
    "x": ["pattern_thwap"],
    "p": ["pattern_beep"],
  };
  const settings = {pattern: {}};
  for (const m of slug.matchAll(/([A-Za-z])([0-9.]+)/g)) {
    if (keys[m[1]]) {
      if (!keys[m[1]].length) throw new Error("Duplicate code value " + m[1]);
      settings[keys[m[1]].shift()] = m[2];
    }
  }
  const stepcount = +settings.stepcount || 8;
  for (const pat of ["boom", "thwap", "beep"]) {
    const octal = settings["pattern_" + pat];
    delete settings["pattern_" + pat];
    if (!octal) continue;
    const p = [];
    for (let i = 0; i < stepcount; i += 3) {
      const dig = +(octal[i / 3] || "0");
      p.push(dig & 4 ? true : false);
      p.push(dig & 2 ? true : false);
      p.push(dig & 1 ? true : false);
    }
    p.length = stepcount; //Truncate to the exact step count
    settings.pattern[pat] = p;
  }
  return settings;
}

on("click", "#toggleplay", (e) => {
  playing = !playing;
  set_content(e.match, playing ? "Stop ||" : "Play >")
  const bufferTime = 0.2;
  let stepTime = audioCtx.currentTime; // in seconds
  let currentStep = 0;
  function inqueue() {
    const stepDuration = 60 / tempoSlider.value;
    const swingDuration = swingSlider.value / 100 * stepDuration;
    while (stepTime < audioCtx.currentTime + bufferTime * 2) {
      if (stepTime >= audioCtx.currentTime) {
        DOM(`#stepaction-0-${currentStep}`).checked && playBeep(stepTime);
        DOM(`#stepaction-1-${currentStep}`).checked && playNoise(stepTime);
        DOM(`#stepaction-2-${currentStep}`).checked && playBoom(stepTime);
      }
      if (++currentStep >= stepCount.value) currentStep = 0;

      // if (currentStep % 2) but we will do this the mathematician's way
      // raise -1 to some exponent to toggle back and forth
      // negative 1 to the power of some integer will always be either
      // negative one or positive one.
      // so the number you put in determines the polarity.
      // In this case we can't simply add time for swung beats, we need
      // to also remove that time from the subsequent beat.
      // so with four beats at 60bpm:
      //  beat 1: 0
      //  beat 2: 50 + 5
      //  beat 3: 50 - 5
      stepTime += stepDuration - swingDuration * ((-1) ** currentStep)
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

function settingsUpdate() {
  const settingsJSON = {};
  document.querySelectorAll("input.setting").forEach(s => settingsJSON[s.name] = s.type == "checkbox" ? s.checked : s.value);
  settingsJSON["pattern"] = {};
  rows.forEach((row, idx) => settingsJSON["pattern"][soundNames[idx]] = Array.from(row.querySelectorAll("input")).map(beat => beat.checked));
  DOM("textarea#settings").value = JSON.stringify(settingsJSON, null, 2);
  history.replaceState(null, "", "#" + shareable(settingsJSON));
}
on("change", "input", settingsUpdate);

function applySettings(settingsJSON) {
  document.querySelectorAll("input.setting").forEach(s => {
    s[s.type === "checkbox" ? "checked" : "value"] = settingsJSON[s.name];
  });
  buildSteps();
  rows.forEach((row, idx) => row.querySelectorAll("input").forEach((beat, bidx) => {
    beat.checked = (settingsJSON["pattern"][soundNames[idx]] || [])[bidx];
  }));
}
(location.hash) && applySettings(load(location.hash.slice(1)));
on("click", "#applySettings", () => {
  applySettings(JSON.parse(DOM("textarea#settings").value))
});
settingsUpdate();
