# The music daemon that broke my mobile E2E suite

> STAR story — fits **"tell me about a tricky bug"**, **Ambiguity**, or **Delivery**.
> Date: 11-06-2026 · Project: Grip (Expo / React Native study case)

## Situation

I was adding an E2E layer to my React Native app: Maestro driving the iOS
simulator through a smoke flow. Unit tests (Jest) were already green. On its
first run, Maestro printed its startup banner — version, OS, Xcode — and then
**nothing**. No error, no timeout, no output. Forever.

The environment was bleeding-edge (macOS 26.5, Xcode 26.3, Maestro 2.6.0), so
every prior probability pointed at a version incompatibility — the kind of bug
you can't fix, only work around or wait out.

## Task

Decide whether E2E testing was viable on this machine at all — and do it
without burning the evening. The trap with silent hangs is guessing: trying
flags, reinstalling, downgrading, each attempt costing minutes and proving
nothing. I needed the process to *tell me* where it was stuck.

## Action

Triage by elimination first: the CLI itself ran (`--version` printed), the
simulator was booted, Metro was up, the app loaded by hand. So the hang was
inside Maestro's startup, between its banner and device discovery.

Maestro runs on the JVM — so instead of guessing, I took a **thread dump**
(`jstack`) of the hung process. The main thread was parked in a raw socket
read inside `dadb` — Maestro's *Android* device-discovery library — at
`AdbConnection.connect`. Before ever touching iOS, Maestro probes the Android
emulator port range (5555–5685), and something had accepted a TCP connection
and never replied to the ADB handshake. No timeout on that read → infinite
silent hang.

`lsof` over that port range found the squatter: **NTKDaemon, Native
Instruments' background helper for music hardware**, listening on
`127.0.0.1:5563`. My audio tooling had broken my mobile test suite through a
pure port-number coincidence.

Killed the daemon (it respawns at login, so nothing was harmed), reran
Maestro: device discovery completed instantly and the smoke flow passed
end-to-end on the first real run.

## Result

- E2E suite unblocked the same evening; the full smoke flow (sign-in,
  all four tabs) green on the simulator.
- The gotcha is documented where the next victim will look: the flow file's
  header carries the symptom, the `lsof` one-liner, and the fix.
- The two false hypotheses (OS/Xcode incompatibility, auth/login problem)
  were never acted on — the thread dump replaced guessing with evidence.

**What I'd tell an interviewer it taught me:** when a process hangs silently,
don't interrogate your own code first — interrogate the *process*. A stack
dump or strace turns "anything could be wrong" into "it's blocked reading
from this exact socket," and from there it's ten minutes of `lsof`, not a
night of superstition. And: the weirdest bugs live at the seams between
systems that were never supposed to meet — like a music daemon and an Android
debugger protocol.

## Appendix — the actual evidence

```text
"main" #1 ... RUNNABLE
   at sun.nio.ch.SocketDispatcher.read0(Native Method)
   ...
   at dadb.AdbReader.readMessage(AdbReader.kt:32)
   at dadb.AdbConnection$Companion.connect(AdbConnection.kt:102)
   ...
   at maestro.device.DeviceService.listAndroidDevices(DeviceService.kt:202)
   at maestro.device.DeviceService.listDevices(DeviceService.kt:155)
```

```text
$ lsof -nP -iTCP:5555-5685 -sTCP:LISTEN
COMMAND    PID  USER  ...  NAME
NTKDaemon 1095  ...        TCP 127.0.0.1:5563 (LISTEN)
```
