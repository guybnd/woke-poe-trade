# The game's own alert sounds

Path of Exile's loot filter sounds, played by the filter editor's preview:
`<id>.ogg` for `PlayAlertSound 1` to `16` and `ShAlchemy` ... `ShVaal`.

Taken from the game's `FMOD/Desktop/ItemFilter.bank` (samples
`AlertSound_01`..`16` and `SH22Alchemy`..`SH22Vaal`), decoded with the game's
FMOD and encoded with `ffmpeg -c:a libvorbis -q:a 4`. They belong to Grinding
Gear Games. Re-extract them if a patch changes the sounds.
