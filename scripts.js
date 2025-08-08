import {choc, set_content, on, DOM} from "https://rosuav.github.io/choc/factory.js";
const { } = choc; //autoimport


let cutoff = null, cutoffTM = null;

on("click", "#boom", (e) => {
  let btn = e.match;
  if (cutoff) cutoff();
  btn.classList.add("playing");
  // create web audio api context
  const audioCtx = new AudioContext();
  const gainNode = new GainNode(audioCtx);
  // create Oscillator node
  const oscillator = audioCtx.createOscillator();
  let startTime = audioCtx.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(110, startTime); // value in hertz

  oscillator.connect(gainNode).connect(audioCtx.destination);
  oscillator.start();
  oscillator.frequency.setTargetAtTime(20, startTime, 4);
  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.setTargetAtTime(0, startTime, 1);
  cutoff = () => {
    oscillator.stop();
    btn.classList.remove("playing");
    clearTimeout(cutoffTM);
    cutoffTM = cutoff = null;
  }
  cutoffTM = setTimeout(cutoff, 4000);
});
