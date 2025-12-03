# Testing: Overlay Server Startup Fix

**Date:** 2025-12-03
**Branch:** (to be created)
**Issue:** App hangs at "Connecting" status on fresh installs, overlay server never starts

## Changes Made

### File: `src/main/main.ts`

**Before (lines 135-178):**
```typescript
// IPC registered
await bringOnline()          // Blocks until CDJ network connects or errors
await startOverlayServer()   // Only runs if network succeeds/errors
```

**After (lines 135-147):**
```typescript
// IPC registered
await startOverlayServer()   // Starts immediately
await bringOnline()          // Then attempts CDJ network connection
```

### Why This Change?

The original order caused the app to hang if `bringOnline()` blocked indefinitely (waiting for CDJs, firewall permission, etc.). The overlay server would never start, leaving users with:
- ❌ App stuck at "Connecting"
- ❌ `http://localhost:5152` showing `ERR_CONNECTION_REFUSED`
- ❌ No way to access overlays even though app is running

The new order ensures:
- ✅ Overlay server always starts (port 5152 immediately available)
- ✅ Overlays work even if CDJ network connection hangs/fails
- ✅ Better user experience (can see "waiting for devices" in overlays)

## Potential Risk: macOS Firewall Bug

### Original Warning Comment (Removed)
```
XXX: Because of a strange bug in MacOS's firewall dialog, if two
connections are opened at the same time before the program is given
permission to open connections, when the software is closed the kernel
will not correctly close one of the ports.

Because the `network.bringOnline` will block until connected we ensure
two are not opened.

As thus THIS LINE MUST BE PLACED AFTER THE NETWORK IS BROUGHT ONLINE.
```

### Analysis

**Original behavior:**
- Network connection (UDP ports 50000-50002) fully completes
- Then HTTP server (port 5152) starts
- Sequential, not simultaneous

**New behavior:**
- HTTP server (port 5152) starts and completes quickly
- Then network connection (UDP ports) starts
- Still sequential, not simultaneous

**Hypothesis:** Should be safe because:
1. Both orders are sequential (using `await`)
2. Different connection types (UDP vs HTTP)
3. New order may be *better* - overlay server gets firewall approval first

**Risk:** If `await` completes before macOS firewall dialog is approved, second connection might start while first dialog is still pending, potentially triggering the kernel bug.

## Test Plan

### Test 1: Fresh Install (Most Important)

This tests the original bug and the firewall behavior.

**Prerequisites:**
- Fresh macOS install OR reset firewall rules for the app
- No CDJs connected to network
- Debug logging enabled

**Steps:**
1. Delete app: `rm -rf "/Applications/STV Prolink Tools.app"`
2. Remove firewall rules: System Settings → Network → Firewall → Options → Remove "STV Prolink Tools"
3. Install new DMG with fix
4. Run `xattr -cr "/Applications/STV Prolink Tools.app"`
5. Launch app from Applications folder (GUI launch, not Terminal)
6. **Watch for firewall dialogs** - note which appears first and when
7. Approve any firewall dialogs
8. Immediately test: `curl http://localhost:5152` (should respond, not refuse)
9. Check app status (should show "Connecting" or "Connection Error", not frozen)
10. Quit app completely
11. Check for zombie ports: `lsof -i :5152` and `lsof -i :50000` (should be empty)
12. **Repeat steps 5-11 three times** to verify consistent behavior

**Expected Results:**
- ✅ Overlay server responds on port 5152 immediately
- ✅ App doesn't freeze/hang
- ✅ Firewall dialogs appear (one or two, note timing)
- ✅ No zombie ports remain after quit
- ✅ Consistent behavior across multiple launches

**Failure Indicators:**
- ❌ Port 5152 refuses connection
- ❌ App hangs/freezes
- ❌ Zombie ports remain after quit (indicates kernel bug)
- ❌ Multiple firewall dialogs appear simultaneously

### Test 2: With CDJs Connected

This tests normal operation with actual DJ equipment.

**Prerequisites:**
- CDJs connected to network
- App already has firewall approval

**Steps:**
1. Launch app from Applications
2. Verify overlay server starts immediately (check logs or curl)
3. Verify app connects to CDJs successfully
4. Verify overlays show track data correctly
5. Quit and check for zombie ports

**Expected Results:**
- ✅ Overlay server starts before CDJ connection
- ✅ CDJs connect successfully after overlay server is running
- ✅ All features work normally
- ✅ No zombie ports after quit

### Test 3: Port Conflict (rekordbox Running)

This tests error handling when port 50000 is already in use.

**Prerequisites:**
- rekordbox or another DJ software using port 50000

**Steps:**
1. Start rekordbox (or manually bind to port 50000)
2. Launch Prolink Tools
3. Verify overlay server still starts (check port 5152)
4. Verify app shows "Connection Error" (not frozen)
5. Quit app and check ports

**Expected Results:**
- ✅ Overlay server starts despite network port conflict
- ✅ App shows appropriate error message
- ✅ No zombie ports after quit

### Test 4: Startup Log Verification

**Steps:**
1. Enable debug logging: View → Toggle Debug Logging
2. Launch app with dev tools open: View → Toggle Developer Tools
3. Check Console tab for startup sequence

**Expected Log Order:**
```
[Main] IPC registered
[Main] Starting overlay server...
[Overlay Server] Starting overlay server...
[Overlay Server] Server listening on http://0.0.0.0:5152
[Main] Overlay server started successfully
[Main] Overlay WebSocket registered
[Main] Attempting to bring network online...
[Main] Network brought online successfully (or failed)
```

**Verify:**
- ✅ Overlay server messages appear BEFORE network connection attempt
- ✅ No long delay between "IPC registered" and "Overlay server started"

### Test 5: Multiple Launches While CDJs Absent

This tests the scenario that originally caused the hang.

**Steps:**
1. Disconnect from CDJ network (or ensure no CDJs present)
2. Launch app
3. Immediately test: `curl http://localhost:5152`
4. Quit app
5. Repeat 5 times quickly
6. Check for zombie ports after all launches

**Expected Results:**
- ✅ Overlay server responds every time
- ✅ No accumulation of zombie ports
- ✅ Consistent behavior across launches

## Testing on Different macOS Versions

Test on:
- ✅ macOS Sequoia 15.x (strictest Gatekeeper)
- ✅ macOS Sonoma 14.x
- ✅ macOS Ventura 13.x (if possible)

## Success Criteria

This fix is ready to merge if:
1. ✅ Overlay server starts immediately on fresh install
2. ✅ App doesn't hang when CDJs are absent
3. ✅ No zombie ports remain after quit
4. ✅ All existing features work normally
5. ✅ Firewall prompts behave reasonably (not multiple simultaneous dialogs)
6. ✅ Consistent behavior across multiple launches

## Rollback Plan

If zombie port bug appears:
1. Revert `src/main/main.ts` to original order
2. Investigate alternative solutions:
   - Add timeout to `bringOnline()` (e.g., 10 seconds)
   - Make network connection fully non-blocking (run in background)
   - Add explicit delay between connections
   - Split overlay server and network into separate processes

## Notes

- Document any firewall dialog behavior observed during testing
- Note any differences between Intel and Apple Silicon Macs
- Check Console.app for any system-level errors about port binding
- Monitor Activity Monitor for proper process cleanup on quit

---

## Test Results

### Tester 1: [Name]
- **Date:**
- **macOS Version:**
- **Mac Model:**
- **Test 1:** ☐ Pass ☐ Fail - Notes:
- **Test 2:** ☐ Pass ☐ Fail - Notes:
- **Test 3:** ☐ Pass ☐ Fail - Notes:
- **Test 4:** ☐ Pass ☐ Fail - Notes:
- **Test 5:** ☐ Pass ☐ Fail - Notes:
- **Overall:** ☐ Approve ☐ Reject - Reason:

### Tester 2: [Name]
- **Date:**
- **macOS Version:**
- **Mac Model:**
- **Test 1:** ☐ Pass ☐ Fail - Notes:
- **Test 2:** ☐ Pass ☐ Fail - Notes:
- **Test 3:** ☐ Pass ☐ Fail - Notes:
- **Test 4:** ☐ Pass ☐ Fail - Notes:
- **Test 5:** ☐ Pass ☐ Fail - Notes:
- **Overall:** ☐ Approve ☐ Reject - Reason:
