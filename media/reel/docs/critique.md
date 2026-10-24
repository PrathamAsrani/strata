# Strata reel: critique

## Round 1 (full contact, 96 frames)
Scores: hook 8 · phone readability 7 · motion 8 · variety 8 · brand 8 · sound 8 (by construction: SFX are generated from HITS).
1. 2D diagram (beats 48-55): the four plates spread into a thin vertical column using a third of the frame. Fix: 2x2 grid (free plate placement, as v0.4.2 allows), FLAT_CAM s 37 → 58.
2. Shots 2-4: the stack is small, two thirds of the frame is empty mat. Fix: s 58 → 62-64, model moved right of the caption column.
3. Mode bar (56-63): the title runs under the button. Fix: 1240 px bar, right-aligned, title 28 px.
Also: bigger full-stop stack in the hook; VLAN 55 label overflowed its band (bands rebalanced).

## Round 2 (stills at the fixed shots)
Scores: hook 8 · readability 8 · motion 8 · variety 9 · brand 8 · sound 8.
1. "IS LYON" mat print slides under the first caption (beat 18-20). Fix: print leaves at 17-18.
2. Kickers (24 px mono) too small on the phone pages. Fix: 27 px.
3. Glyph check: only "⇄" is missing from Archivo; it is used in the mono kicker only (IBM Plex Mono has it). Pass.

## Round 3 (strips across hook→stack, 3D→2D, night wipe, end card)
Scores: hook 8 · readability 8 · motion 8 · variety 9 · brand 9 · sound 8.
1. End card transition: the stack tipped to top-down before shrinking (an awkward plan view). Fix: sink 78.6-79.8, end camera after it (79.2).
2. Night wipe: one bright seam crossing on the switch press, both palettes on screen. Pass (the only flash).
3. 3D→2D: plates rotate and spread with cards crossfading in; caption clear of the diagram. Pass.
Remaining: sync.py could not run here (no access to PyPI for librosa); picture and sound share the HITS list, so hits line up by construction. Smallest UI text (2D card IPs, chips) is decorative at phone size.
