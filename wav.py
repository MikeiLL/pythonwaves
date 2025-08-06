#!/usr/bin/env python3
"""
Create a SIN wave and write it out to a wav.
rosuav@rosuav.com, mike@mzoo.org
"""
import math
import wave
import matplotlib.pyplot as plt


SAMPLE_FREQ = 44100
SAMPLE_DEPTH = 65536 # must be a power of 256 so: 256, 65536 maybe 256.pow(3) or 256.pow(4)
AMPLITUDE = 30000 # must be less than SAMPLE_DEPTH
PITCH = 110
samples = bytearray()
viewsamples = []
for i in range(88200): # 44.4khz
  # amplitude formerly SAMPLE_DEPTH / 2
  sample = int(math.sin(i / SAMPLE_FREQ * math.pi * PITCH) * AMPLITUDE)
  viewsamples.append(sample)
  if sample < 0: sample += SAMPLE_DEPTH # work with signed
  # offset (unsigned) - if not work try signed samples
  sample = min(max(0, sample), SAMPLE_DEPTH - 1) # clamp/clip to sample depth
  samples.append(sample % 256) # low byte
  samples.append(sample // 256) # high byte

plt.plot(viewsamples[:3000])
plt.show()

with wave.open("pywav.wav", "wb") as wav:
  wav.setsampwidth(2) # 65536
  wav.setframerate(SAMPLE_FREQ)
  wav.setnchannels(1)
  wav.writeframes(samples)
