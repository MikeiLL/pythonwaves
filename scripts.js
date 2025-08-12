import {choc, set_content, on, DOM} from "https://rosuav.github.io/choc/factory.js";
const { } = choc; //autoimport


let cutoff = null, cutoffTM = null;
const decay = document.getElementById("decay");
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
  console.log({
    "decay / 4" : decay.value / 4,
    "decay / 2" : decay.value / 2,
  });
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


on("click", "#boom", sineboom);
decay.addEventListener("change", (e) => DOM("#decayvalue").innerHTML = e.currentTarget.value);
