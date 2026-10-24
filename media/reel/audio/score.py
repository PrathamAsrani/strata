"""Strata score: house bed in D minor, 120 bpm, 48 s. Pure numpy/scipy, seeded.
Writes audio/music.wav (48 kHz stereo) and beats.json (exact grid: offset 0, period 0.5 s).
Sections (beats): intro 0-16, build 16-32, drop 32-48, groove 48-64, lift 64-72, night 72-80, end 80-96.
Run from the project folder: python3 strata/audio/score.py
"""
import json
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
BPM = 120
P = 60 / BPM            # seconds per beat
DUR = 48.0
N = int(DUR * SR)
FILM = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(20261024)

L = np.zeros(N)
R = np.zeros(N)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf_l, buf_r, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    x = x[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    buf_l[i:i + len(x)] += x * gl
    buf_r[i:i + len(x)] += x * gr


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.1, hold=None):
    t = np.arange(n) / SR
    hold = (n / SR - r) if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-6), 1.0)
    dmask = (t >= a) & (t < a + d)
    e = np.where(dmask, 1 - (1 - s) * (t - a) / d, e)
    e = np.where(t >= a + d, s, e)
    rmask = t >= hold
    e = np.where(rmask, s * np.clip(1 - (t - hold) / r, 0, 1), e)
    return e


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'low')
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, min(fc / (SR / 2), 0.99), 'high')
    return signal.lfilter(b, a, x)


def bp(x, f1, f2):
    b, a = signal.butter(2, [f1 / (SR / 2), f2 / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


# ---------------------------------------------------------------- instruments
def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 180) * 0.25
    return np.tanh(1.6 * (body + click)) * 0.9


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 4200)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        e += np.where(t >= off, np.exp(-(t - off) * (90 if k < 2 else 18)), 0)
    return nz * e * 0.45


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    nz = hp(rng.standard_normal(n), 7500, 4)
    return nz * np.exp(-t * (14 if open_ else 70)) * (0.22 if open_ else 0.16)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    return 2 * ((t * f) % 1.0) - 1


def pad_chord(notes, dur, bright=1200):
    n = int(dur * SR)
    x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.0, 0.007):
            x += saw(hz(m), n, d)
    x = lp(x / (len(notes) * 3), bright, 2)
    return x * env_adsr(n, a=0.25, d=0.3, s=0.85, r=0.4)


def bass_note(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = 0.7 * np.sin(2 * np.pi * hz(m) * t) + 0.35 * saw(hz(m), n)
    x = lp(x, 420, 2)
    return np.tanh(1.4 * x) * env_adsr(n, a=0.004, d=0.08, s=0.8, r=0.03) * 0.55


def pluck(m, dur=0.22):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = (saw(hz(m), n) * 0.6 + np.sin(2 * np.pi * hz(m) * 2 * t) * 0.3)
    x = lp(x, 2600, 2) * np.exp(-t * 16)
    return x * 0.22


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 2048
    for i in range(0, n, seg):
        fc = 400 + 7000 * (i / n) ** 2
        out[i:i + seg] = bp(nz[i:i + seg + 0], fc * 0.7, min(fc * 1.3, 20000))[:len(out[i:i + seg])]
    return out * (t / dur) ** 2 * 0.25


# ---------------------------------------------------------------- arrangement
CHORDS = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]   # Dm  Bb  F  C
ROOTS = [38, 34, 41, 36]
ARP = [[62, 65, 69, 74], [58, 62, 65, 70], [65, 69, 72, 77], [60, 64, 67, 72]]

PAD_L = np.zeros(N); PAD_R = np.zeros(N)
DRM_L = np.zeros(N); DRM_R = np.zeros(N)
BAS = np.zeros(N)
ARP_L = np.zeros(N); ARP_R = np.zeros(N)

K, CL, HC, HO = kick(), clap(), hat(), hat(True)
kick_times = []

total_beats = int(DUR / P)
for bar in range(total_beats // 4 + 1):
    b0 = bar * 4
    t0 = b0 * P
    ci = bar % 4
    # pad everywhere, brighter in the main section
    if b0 < 88:
        bright = 900 if b0 < 16 else 1400 if b0 < 32 else 2400 if b0 < 48 else 1700 if b0 < 64 else 1200 if b0 < 72 else 1000 if b0 < 80 else 1800
        pc = pad_chord(CHORDS[ci], 4 * P + 0.3, bright)
        place(PAD_L, PAD_R, pc, t0, 0.62 if b0 < 16 else 0.32, -0.25)
        place(PAD_L, PAD_R, pad_chord([m + 12 for m in CHORDS[ci]], 4 * P + 0.3, bright), t0, 0.24 if (b0 < 16 or 64 <= b0 < 72) else 0.12, 0.3)

    for k in range(4):
        b = b0 + k
        t = b * P
        if t >= DUR:
            break
        # kick: half-time in the build, four on the floor in main + end until the final chord
        if (16 <= b < 32 and b % 2 == 0) or (32 <= b < 64) or (72 <= b < 88) or (64 <= b < 72 and b % 2 == 0):
            place(DRM_L, DRM_R, K, t, 1.0)
            kick_times.append(t)
        if 28 <= b < 32 and b % 1 == 0:      # build fill: extra kicks on the last bar
            place(DRM_L, DRM_R, K, t + P / 2, 0.55)
        # clap on 2 and 4
        if (32 <= b < 48 or 72 <= b < 88) and b % 2 == 1:
            place(DRM_L, DRM_R, CL, t, 0.9, 0.05)
        # hats
        if 16 <= b < 88 and not (64 <= b < 68):
            place(DRM_L, DRM_R, HO, t + P / 2, 0.8, 0.35)
        if 32 <= b < 48 or 72 <= b < 80:
            for s in (0.25, 0.75):
                place(DRM_L, DRM_R, HC, t + s * P, 0.7, -0.3)
        # bass: sustained in the build, eighth-note pump in main and end
        if 16 <= b < 32:
            if k == 0:
                place(BAS, BAS, bass_note(ROOTS[ci], 4 * P - 0.05), t, 0.8)
        elif 32 <= b < 64 or 72 <= b < 88:
            for s in (0.5,):
                place(BAS, BAS, bass_note(ROOTS[ci], P / 2 - 0.02), t + s * P, 1.0)
            place(BAS, BAS, bass_note(ROOTS[ci] + (12 if k == 3 else 0), P / 2 - 0.02), t, 0.7)
        # arp: sixteenths, intro (sparse), main and break
        if b < 16 or 32 <= b < 72:
            notes = ARP[ci]
            steps = (0, 2) if b < 16 else (0, 1, 2, 3)
            for j in steps:
                m = notes[(k * 4 + j) % 4]
                g = 1.5 if b < 16 else 1.0 if b < 48 else 0.8 if b < 64 else 1.3
                place(ARP_L, ARP_R, pluck(m), t + j * P / 4, g, 0.4 if j % 2 else -0.4)

# riser into the drop (beats 26-32) and into the end card (72-76)
rz = riser(6 * P)
place(DRM_L, DRM_R, rz, 26 * P, 1.0)
rz2 = riser(4 * P)
place(DRM_L, DRM_R, rz2, 68 * P, 0.8)

# final chord at beat 84, long decay
fc = np.zeros(int(3.2 * SR))
for m in [38, 50, 53, 57, 62, 69]:
    seg = pad_chord([m], 3.2, 1600)
    fc[:len(seg)] += seg
fc *= np.exp(-np.arange(len(fc)) / SR * 0.8)
place(PAD_L, PAD_R, fc, 88 * P, 0.22, 0.0)

# sidechain: duck pad, bass, arp after each kick
duck = np.ones(N)
for t in kick_times:
    i = int(t * SR)
    n = int(0.32 * SR)
    seg = 1 - 0.65 * np.exp(-np.arange(n) / SR * 11)
    j = min(N, i + n)
    duck[i:j] = np.minimum(duck[i:j], seg[: j - i])

# simple stereo space for the arp: short delay
d = int(0.375 * SR)
ARP_L[d:] += ARP_R[:-d] * 0.3
ARP_R[d:] += ARP_L[:-d] * 0.3

L = DRM_L + (PAD_L + BAS + ARP_L) * duck
R = DRM_R + (PAD_R + BAS + ARP_R) * duck
# gentle bus: highpass rumble, soft clip, fade the last 0.6 s
L, R = hp(L, 28), hp(R, 28)
mx = np.stack([L, R], 1)
mx = np.tanh(mx * 1.1) / np.tanh(1.1)
fade = int(0.6 * SR)
mx[-fade:] *= np.linspace(1, 0, fade)[:, None]
mx /= max(1e-9, np.abs(mx).max()) / 0.89

(FILM / 'audio').mkdir(exist_ok=True)
wavfile.write(FILM / 'audio' / 'music.wav', SR, (mx * 32767).astype(np.int16))

beats = [round(i * P, 5) for i in range(total_beats + 1)]
mono = mx.mean(1)
bar_s = 4 * P
bar_energy = [round(float(np.sqrt(np.mean(mono[int(i * bar_s * SR):int((i + 1) * bar_s * SR)] ** 2) + 1e-12)), 4)
              for i in range(int(DUR / bar_s))]
grid = {
    'bpm': BPM, 'period': P, 'offset': 0.0, 'beats': beats,
    'downbeats': [b for i, b in enumerate(beats) if i % 4 == 0],
    'sections': [{'name': 'intro', 'beat': 0}, {'name': 'build', 'beat': 16}, {'name': 'drop', 'beat': 32},
                 {'name': 'groove', 'beat': 48}, {'name': 'lift', 'beat': 64}, {'name': 'night', 'beat': 72}, {'name': 'end', 'beat': 80}],
    'bar_energy': bar_energy, 'source': 'audio/score.py (synthesized, exact grid)',
}
(FILM / 'beats.json').write_text(json.dumps(grid, indent=1))
print(f'music.wav {DUR}s, {BPM} bpm, {len(beats)} beats; bar energy {bar_energy}')
